# lambda_function.py  —  S3-triggered analyzer (outputs ONLY gpt_week_summary)
# Trigger: S3 ObjectCreated on keys like users/*/raw/latest.json
#
# ENV VARS:
#   BUCKET_NAME     (optional)  -> override source bucket; otherwise uses the event's bucket
#   ANALYZED_BUCKET (required)  -> destination bucket for analyzed files
#
# OUTPUT (written to ANALYZED_BUCKET):
#   users/{userId}/analyzed/latest.json
#   users/{userId}/analyzed/history/{timestamp}.json
#
# Notes (this version):
# - Best-focus blocks: non-overlapping 2h windows, with optional min gap (0h by default).
# - Hour-level focus uses ONLY HRV↑ and HR↓ (no steps). When HR/HRV are missing,
#   we fall back to a circadian prior learned from the user's history (HR/HRV-only),
#   then lightly smooth. Output schema unchanged.

import os
import json
import boto3
from datetime import datetime, timezone
from urllib.parse import unquote_plus
from statistics import median
from collections import defaultdict

# ---------- AWS ----------
s3 = boto3.client('s3')
SRC_BUCKET_OVERRIDE = os.environ.get("BUCKET_NAME")          # optional
DEST_BUCKET         = os.environ.get("ANALYZED_BUCKET")      # REQUIRED

# ---------- CONFIG ----------
FOCUS_HOURS_START = 8
FOCUS_HOURS_END   = 22
FOCUS_BLOCK_LEN   = 2
FOCUS_TOP_K       = 2
FOCUS_BLOCK_MIN_GAP = 0   # hours of gap required between selected windows (0 = adjacency allowed)

# Sleep curve: 6h -> 0, 8h -> 1, 12h -> back to ~0
SLEEP_LO_H   = 6
SLEEP_PEAK_H = 8
SLEEP_HI_H   = 12

# Weights
SLEEP_W_DURATION = 0.80
SLEEP_W_STAGES   = 0.20

FOCUS_W_HRV   = 0.45
FOCUS_W_RHR   = 0.25
FOCUS_W_SLEEP = 0.20
FOCUS_W_DEBT  = 0.05
FOCUS_W_LOWER_STRAIN_BONUS = 0.05

PHYS_W_STEPS = 0.40
PHYS_W_CAL   = 0.30
PHYS_W_TLOAD = 0.30

WORKOUT_COEFF = {
    "Running": 1.2, "Cycling": 1.0, "Walking": 0.6,
    "TraditionalStrengthTraining": 1.1, "HighIntensityIntervalTraining": 1.3,
    "Yoga": 0.5, "Pilates": 0.6, "Swimming": 1.1, "Rowing": 1.0,
}

# Rank rescale (spreads available weekdays evenly in this range)
RESCALE_LOW  = 60.0
RESCALE_HIGH = 95.0

# ---------- Utilities ----------
def _parse_iso(dt: str):
    """ISO8601 -> aware datetime (UTC if no tz)."""
    if not dt:
        return None
    try:
        if dt.endswith("Z"):
            dt = dt.replace("Z", "+00:00")
        d = datetime.fromisoformat(dt)
        if d.tzinfo is None:
            d = d.replace(tzinfo=timezone.utc)
        return d
    except Exception:
        return None

def _ensure_list(x):
    if x is None:
        return []
    return x if isinstance(x, list) else [x]

def average(lst):
    return (sum(lst) / len(lst)) if lst else None

def clamp(x, lo, hi):
    return lo if x < lo else hi if x > hi else x

def _quantile(values, q):
    if not values:
        return None
    arr = sorted(values)
    k = (len(arr) - 1) * q
    i = int(k)
    j = min(i + 1, len(arr) - 1)
    frac = k - i
    return arr[i] + (arr[j] - arr[i]) * frac

def rminmax(value, values, invert=False):
    """Robust min-max using 5–95th percentiles -> 0..1 (None-safe)."""
    if value is None or not values:
        return None
    lo = _quantile(values, 0.05)
    hi = _quantile(values, 0.95)
    if lo is None or hi is None or hi <= lo:
        return 0.5
    n = (value - lo) / (hi - lo)
    n = clamp(n, 0.0, 1.0)
    return (1.0 - n) if invert else n

def triangular_score(x_minutes, lo_h, peak_h, hi_h):
    """Piecewise linear: ≤lo->0, ↑ to 1 at peak, ↓ to 0 at ≥hi."""
    if x_minutes is None:
        return None
    x = x_minutes / 60.0
    if x <= lo_h or x >= hi_h:
        return 0.0
    if x == peak_h:
        return 1.0
    if x < peak_h:
        return (x - lo_h) / (peak_h - lo_h)
    return (hi_h - x) / (hi_h - peak_h)

def rescale_by_rank(values_map, lo=RESCALE_LOW, hi=RESCALE_HIGH):
    """Evenly spread values by rank across [lo..hi]."""
    if not values_map:
        return {}
    items = [(k, max(0.0, min(100.0, float(v) if v is not None else 0.0))) for k, v in values_map.items()]
    items.sort(key=lambda kv: kv[1])  # ascending
    n = len(items)
    if n == 1:
        return {items[0][0]: round((lo + hi) / 2.0, 1)}
    out = {}
    for rank, (k, _v) in enumerate(items, start=1):
        scaled = lo + (hi - lo) * (rank - 1) / (n - 1)
        out[k] = round(scaled, 1)
    return out

def _workout_label(activity_type: str):
    if not activity_type:
        return "Other"
    return activity_type.split(".")[-1]

def _training_load(workouts):
    load = 0.0
    for w in _ensure_list(workouts):
        t = _workout_label(w.get("type") or w.get("workoutActivityType"))
        coeff = WORKOUT_COEFF.get(t, 0.8)
        dur = w.get("duration_min")
        if dur is None:
            if "durationSeconds" in w:
                dur = float(w["durationSeconds"]) / 60.0
            else:
                dur = float(w.get("duration", 0))
        load += float(dur) * coeff
    return load

# ---------- Extractors from raw daily data ----------
def _extract_by_hour(samples, value_key, time_key="time"):
    perh = defaultdict(list)
    for s in _ensure_list(samples):
        t = _parse_iso(s.get(time_key) or s.get("date") or s.get("timestamp"))
        if not t:
            continue
        v = s.get(value_key)
        if v is None:
            continue
        try:
            v = float(v)
        except Exception:
            continue
        perh[t.hour].append(v)
    return {h: average(v) for h, v in perh.items() if v}

def _extract_steps(day):
    # Common dict shape
    if isinstance(day.get("steps"), dict):
        sd = day["steps"]
        if "hourly" in sd and isinstance(sd["hourly"], dict):
            hourly = {int(h): float(v) for h, v in sd["hourly"].items()}
            total = int(round(sum(hourly.values())))
            return total, hourly
        if "total" in sd:
            try:
                return int(sd["total"]), {}
            except Exception:
                pass
    # Fallback: samples list
    samples = day.get("steps") or day.get("stepSamples") or []
    perh = defaultdict(float)
    total = 0.0
    for s in _ensure_list(samples):
        t = _parse_iso(s.get("time") or s.get("timestamp") or s.get("date"))
        v = s.get("count") or s.get("value") or s.get("steps")
        if not t or v is None:
            continue
        try:
            v = float(v)
        except Exception:
            continue
        perh[t.hour] += v
        total += v
    return int(round(total)), dict(perh)

def _extract_calories(day):
    cand = day.get("activeEnergy") or day.get("caloriesActive") or day.get("calories")
    if isinstance(cand, dict):
        if "total" in cand:
            try:
                return float(cand["total"])
            except Exception:
                pass
        if "samples" in cand:
            vals = []
            for s in _ensure_list(cand["samples"]):
                try:
                    vals.append(float(s.get("value", 0)))
                except Exception:
                    pass
            return sum(vals) if vals else 0.0
    try:
        return float(cand) if cand is not None else 0.0
    except Exception:
        return 0.0

def _extract_resting_hr(day):
    r = day.get("restingHeartRate")
    if isinstance(r, (int, float, str)):
        try:
            return float(r)
        except Exception:
            return None
    if isinstance(r, dict) and "value" in r:
        try:
            return float(r["value"])
        except Exception:
            return None
    if isinstance(r, list) and r:
        try:
            return float(r[-1])
        except Exception:
            return None
    return None

def _extract_hr_hrv(day):
    hr_hour  = _extract_by_hour(day.get("heartRate") or day.get("hr") or [], value_key="bpm")
    if not hr_hour:
        hr_hour = _extract_by_hour(day.get("heartRate") or day.get("hr") or [], value_key="value")
    hrv_hour = _extract_by_hour(day.get("hrv") or day.get("heartRateVariability") or [], value_key="sdnn")
    if not hrv_hour:
        hrv_hour = _extract_by_hour(day.get("hrv") or day.get("heartRateVariability") or [], value_key="value")
    return hr_hour, hrv_hour

def _extract_sleep_segments(day):
    segments = []
    raw = day.get("sleep")
    if isinstance(raw, dict) and "segments" in raw:
        raw = raw["segments"]
    for s in _ensure_list(raw):
        stage = (s.get("stage") or s.get("state") or "").lower()
        if stage in ("inbed", "in_bed", "in-bed"):
            continue
        if stage in ("asleepcore", "core", "light"): stage = "core"
        elif stage in ("asleeprem", "rem"):          stage = "rem"
        elif stage in ("asleepdeep", "deep"):        stage = "deep"
        else:
            if "sleep" in stage: stage = "core"
        if stage not in ("core","rem","deep"):
            continue
        st = _parse_iso(s.get("start") or s.get("startTime") or s.get("startDate"))
        en = _parse_iso(s.get("end")   or s.get("endTime")   or s.get("endDate"))
        if st and en and en > st:
            segments.append((st, en, stage))
    return segments

# ---------- Scoring helpers ----------
def _build_sleep_from_segments(segments):
    if not segments:
        return 0.0, {"core":0.0,"rem":0.0,"deep":0.0}
    total_min = 0.0
    bd = {"core":0.0,"rem":0.0,"deep":0.0}
    for st, en, stage in sorted(segments, key=lambda x: x[0]):
        m = (en - st).total_seconds()/60.0
        total_min += m
        bd[stage] += m
    return total_min, bd

def _sleep_score(minutes, breakdown):
    dur = triangular_score(minutes, SLEEP_LO_H, SLEEP_PEAK_H, SLEEP_HI_H)
    stage_frac = None
    if minutes and breakdown:
        rd = float(breakdown.get("rem", 0) + breakdown.get("deep", 0))
        stage_frac = rd / float(minutes) if minutes > 0 else None
    n_stage = None
    if stage_frac is not None:
        n_stage = clamp((stage_frac - 0.10) / (0.60 - 0.10), 0.0, 1.0)
    parts = []
    if dur     is not None: parts.append(SLEEP_W_DURATION * dur)
    if n_stage is not None: parts.append(SLEEP_W_STAGES   * n_stage)
    score = 100.0 * sum(parts) if parts else 0.0
    return round(clamp(score, 0.0, 100.0), 1)

def _physical_capacity(steps_total, calories_total, tload, all_steps, all_cal, all_tload):
    n_steps = rminmax(float(steps_total or 0), all_steps)
    n_cal   = rminmax(float(calories_total or 0.0), all_cal)
    n_tload = rminmax(float(tload or 0.0), all_tload)
    comp = []
    if n_steps is not None: comp.append(PHYS_W_STEPS * n_steps)
    if n_cal   is not None: comp.append(PHYS_W_CAL   * n_cal)
    if n_tload is not None: comp.append(PHYS_W_TLOAD * n_tload)
    raw_strain = sum(comp) if comp else 0.5
    capacity = 1.0 - raw_strain
    return clamp(100.0 * capacity, 0.0, 100.0)

def _focus_base(hrv_hour, hr_hour, rhr, sleep_score, all_hrv_vals, arr_rhr_vals):
    hrv_day = average(list(hrv_hour.values())) if hrv_hour else None
    n_hrv = rminmax(hrv_day, all_hrv_vals) if hrv_day is not None else None
    n_rhr = rminmax(rhr,    arr_rhr_vals, invert=True) if rhr is not None else None
    parts = []
    if n_hrv is not None: parts.append(FOCUS_W_HRV * n_hrv)
    if n_rhr is not None: parts.append(FOCUS_W_RHR * n_rhr)
    if sleep_score is not None: parts.append(FOCUS_W_SLEEP * (sleep_score/100.0))
    base = sum(parts) if parts else 0.5
    return base

def _build_circadian_prior(hour_focus_contribs, start_h=FOCUS_HOURS_START, end_h=FOCUS_HOURS_END):
    """
    Build a per-hour prior from all weekdays using HR/HRV-derived scores only.
    Uses median for robustness to outliers.
    """
    pool = defaultdict(list)
    for _wd, per_h in hour_focus_contribs.items():
        for h, vals in per_h.items():
            if start_h <= h <= end_h and vals:
                pool[h].extend(vals)
    return {h: median(v) for h, v in pool.items() if v}

def _smooth_hours(hour_map, k=3):
    """
    Simple centered moving average over hours to denoise spikes.
    k=3 keeps things gentle; edges stay unsmoothed if neighbors are missing.
    """
    if not hour_map:
        return {}
    hours = list(range(FOCUS_HOURS_START, FOCUS_HOURS_END + 1))
    sm = {}
    r = max(1, k // 2)
    for i, h in enumerate(hours):
        vals = []
        for j in range(max(0, i - r), min(len(hours), i + r + 1)):
            hj = hours[j]
            v = hour_map.get(hj)
            if v is not None:
                vals.append(v)
        sm[h] = (sum(vals) / len(vals)) if vals else hour_map.get(h)
    return sm

def _best_focus_blocks_for_weekday(hour_scores,
                                   start_h=FOCUS_HOURS_START,
                                   end_h=FOCUS_HOURS_END,
                                   block_len=FOCUS_BLOCK_LEN,
                                   top_k=FOCUS_TOP_K,
                                   non_overlap=True,
                                   min_gap=FOCUS_BLOCK_MIN_GAP):
    """
    Build all candidate windows, sort by score, then greedily select non-overlapping ones.
    'min_gap' enforces a gap (in hours) between chosen windows; 0 means adjacency allowed.
    """
    windows = []
    for h in range(start_h, end_h - block_len + 2):
        ok = True
        vals = []
        for i in range(block_len):
            v = hour_scores.get(h + i)
            if v is None:
                ok = False
                break
            vals.append(v)
        if ok:
            windows.append((h, sum(vals) / block_len))

    windows.sort(key=lambda x: x[1], reverse=True)

    selected, taken = [], []
    for h, s in windows:
        if not non_overlap:
            selected.append((h, s))
        else:
            start, end = h, h + block_len  # half-open [start, end)
            conflict = False
            for ts, te in taken:
                # require that [start,end) is completely outside [ts,te) with optional min_gap
                if not (end + min_gap <= ts or te + min_gap <= start):
                    conflict = True
                    break
            if not conflict:
                selected.append((h, s))
                taken.append((start, end))
        if len(selected) >= top_k:
            break

    return [{"label": f"{h:02d}:00–{h+block_len:02d}:00", "score": round(s, 3)} for h, s in selected]

# ---------- Main analysis ----------
def analyze_latest(raw):
    daily = raw.get("dailyData", {})
    if not isinstance(daily, dict) or not daily:
        return {"version": "2.0", "gpt_week_summary": {}}

    per_day = {}
    all_steps_vals, all_cal_vals, all_tload_vals = [], [], []
    all_hr_vals, all_hrv_vals, arr_rhr_vals = [], [], []
    sleep_minutes_list = []

    # First pass: extract normalized daily features
    for date, day in sorted(daily.items()):
        steps_total, steps_hour = _extract_steps(day)
        calories_total = _extract_calories(day)
        rhr = _extract_resting_hr(day)
        hr_hour, hrv_hour = _extract_hr_hrv(day)

        all_steps_vals.append(float(steps_total or 0))
        all_cal_vals.append(float(calories_total or 0.0))

        if hr_hour:
            all_hr_vals.extend([v for v in hr_hour.values() if v is not None])
        if hrv_hour:
            all_hrv_vals.extend([v for v in hrv_hour.values() if v is not None])
        if rhr is not None:
            arr_rhr_vals.append(float(rhr))

        tload = _training_load(day.get("workouts") or day.get("workout") or [])
        all_tload_vals.append(float(tload or 0.0))

        segments = _extract_sleep_segments(day)
        sleep_min, breakdown = _build_sleep_from_segments(segments)
        if sleep_min:
            sleep_minutes_list.append(sleep_min)

        per_day[date] = {
            "steps_total": steps_total,
            "steps_hour": steps_hour,  # not used for focus anymore; kept for physical capacity
            "calories_total": calories_total,
            "rhr": rhr,
            "hr_hour": hr_hour,
            "hrv_hour": hrv_hour,
            "tload": tload,
            "sleep_min": sleep_min,
            "sleep_breakdown": breakdown
        }

    sleep_target = median(sleep_minutes_list) if sleep_minutes_list else 8 * 60
    sleep_debts = {d: (sleep_target - per_day[d]["sleep_min"]) for d in per_day}
    arr_sleep_debt_vals = list(sleep_debts.values())

    day_sleep_score = {}
    day_physical_raw = {}
    day_focus_raw = {}
    hour_focus_contribs = defaultdict(lambda: defaultdict(list))  # weekday -> hour -> [score]

    weekday_name = lambda ds: datetime.strptime(ds, "%Y-%m-%d").strftime("%A")

    for date in sorted(per_day.keys()):
        pd = per_day[date]
        sscore = _sleep_score(pd["sleep_min"], pd["sleep_breakdown"])
        day_sleep_score[date] = sscore

        phys = _physical_capacity(
            pd["steps_total"], pd["calories_total"], pd["tload"],
            all_steps_vals, all_cal_vals, all_tload_vals
        )
        day_physical_raw[date] = phys

        base_focus = _focus_base(pd["hrv_hour"], pd["hr_hour"], pd["rhr"], sscore, all_hrv_vals, arr_rhr_vals)
        n_debt = rminmax(sleep_debts.get(date), arr_sleep_debt_vals, invert=True) if arr_sleep_debt_vals else None
        low_strain_bonus = (phys/100.0)  # phys already inverted strain
        parts = [base_focus]
        if n_debt is not None:
            parts.append(FOCUS_W_DEBT * n_debt)
        parts.append(FOCUS_W_LOWER_STRAIN_BONUS * low_strain_bonus)
        focus_scalar = 100.0 * clamp(sum(parts), 0.0, 1.0)
        day_focus_raw[date] = round(focus_scalar, 1)

        # --- Hour-level focus: HRV↑ (0.65), HR↓ (0.35); no steps, no steps fallback.
        hr_hour    = pd["hr_hour"] or {}
        hrv_hour   = pd["hrv_hour"] or {}

        for h in range(FOCUS_HOURS_START, FOCUS_HOURS_END + 1):
            hr_v   = hr_hour.get(h)
            hrv_v  = hrv_hour.get(h)

            hr_n  = rminmax(hr_v,   all_hr_vals,  invert=True) if hr_v  is not None else None
            hrv_n = rminmax(hrv_v,  all_hrv_vals)               if hrv_v is not None else None

            comp = []
            if hrv_n is not None: comp.append(0.65 * hrv_n)
            if hr_n  is not None: comp.append(0.35 * hr_n)

            if comp:
                wd = weekday_name(date)
                hour_focus_contribs[wd][h].append(sum(comp))

    # --- Aggregate to weekday profiles (raw averages) ---
    weekday_scores_sleep   = defaultdict(list)
    weekday_scores_physical= defaultdict(list)
    weekday_scores_focus   = defaultdict(list)
    weekday_hour_avg = {}

    for date in per_day:
        wd = weekday_name(date)
        if day_sleep_score.get(date) is not None:
            weekday_scores_sleep[wd].append(day_sleep_score[date])
        if day_physical_raw.get(date) is not None:
            weekday_scores_physical[wd].append(day_physical_raw[date])
        if day_focus_raw.get(date) is not None:
            weekday_scores_focus[wd].append(day_focus_raw[date])

    for wd, per_h_lists in hour_focus_contribs.items():
        weekday_hour_avg[wd] = {h: (sum(v)/len(v)) for h, v in per_h_lists.items() if v}

    # Build a global per-hour prior (0..1) from historical HR/HRV-only signals
    circadian_prior = _build_circadian_prior(hour_focus_contribs)

    # Fill missing hours with a shrunk prior (so real data dominates) and lightly smooth
    weekday_hour_filled = {}
    for wd, per_h in weekday_hour_avg.items():
        filled = {}
        for h in range(FOCUS_HOURS_START, FOCUS_HOURS_END + 1):
            v = per_h.get(h)
            if v is None and circadian_prior.get(h) is not None:
                v = 0.90 * circadian_prior[h]  # shrink prior
            filled[h] = v
        weekday_hour_filled[wd] = _smooth_hours(filled, k=3)

    # --- Rescale daily averages by weekday to 60..95 (relative spread) ---
    avg_sleep_raw    = {wd: round(sum(v)/len(v), 1) for wd, v in weekday_scores_sleep.items() if v}
    avg_physical_raw = {wd: round(sum(v)/len(v), 1) for wd, v in weekday_scores_physical.items() if v}
    avg_focus_raw    = {wd: round(sum(v)/len(v), 1) for wd, v in weekday_scores_focus.items() if v}

    sleep_scaled    = rescale_by_rank(avg_sleep_raw,    RESCALE_LOW, RESCALE_HIGH)
    physical_scaled = rescale_by_rank(avg_physical_raw, RESCALE_LOW, RESCALE_HIGH)
    focus_scaled    = rescale_by_rank(avg_focus_raw,    RESCALE_LOW, RESCALE_HIGH)

    week_order = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"]
    gpt_week_summary = {}
    for wd in week_order:
        if wd not in sleep_scaled and wd not in physical_scaled and wd not in focus_scaled:
            continue
        best_blocks = _best_focus_blocks_for_weekday(
            weekday_hour_filled.get(wd, {}),
            non_overlap=True,
            min_gap=FOCUS_BLOCK_MIN_GAP
        ) if weekday_hour_filled.get(wd) else []
        gpt_week_summary[wd] = {
            "sleep_score": sleep_scaled.get(wd),
            "physical":    physical_scaled.get(wd),
            "focus":       focus_scaled.get(wd),
            "best_focus_blocks": best_blocks
        }

    return {"version": "2.0", "gpt_week_summary": gpt_week_summary}

# ---------- Lambda entry ----------
def lambda_handler(event, context):
    if not DEST_BUCKET:
        raise RuntimeError("ANALYZED_BUCKET env var is required")

    rec = event["Records"][0]
    src_bucket = SRC_BUCKET_OVERRIDE or rec["s3"]["bucket"]["name"]
    src_key    = unquote_plus(rec["s3"]["object"]["key"])

    # Expect keys like users/{userId}/raw/latest.json
    parts = src_key.split("/")
    user_id = parts[1] if len(parts) >= 4 else "unknown"

    obj = s3.get_object(Bucket=src_bucket, Key=src_key)
    raw = json.loads(obj["Body"].read())

    result = analyze_latest(raw)

    now = datetime.utcnow().isoformat(timespec="seconds") + "Z"
    safe_ts = now.replace(":", "-").replace(".", "-")
    out_latest = f"users/{user_id}/analyzed/latest.json"
    out_hist   = f"users/{user_id}/analyzed/history/{safe_ts}.json"
    body = json.dumps(result, ensure_ascii=False, indent=2).encode("utf-8")

    s3.put_object(Bucket=DEST_BUCKET, Key=out_latest, Body=body, ContentType="application/json")
    s3.put_object(Bucket=DEST_BUCKET, Key=out_hist,   Body=body, ContentType="application/json")

    return {
        "statusCode": 200,
        "body": json.dumps({"ok": True, "userId": user_id, "wrote": [out_latest, out_hist]})
    }

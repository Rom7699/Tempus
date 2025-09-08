# lambda_function.py — Generate a weekly schedule using analyzed health data (S3) + OpenAI
# No DB writes. No "revise mode". Each task may include optional user notes.
#
# Env vars:
#   OPENAI_API_KEY        (required)
#   DATABASE_API_URL      (required)  e.g., https://...execute-api.us-east-1.amazonaws.com
#   ANALYZED_BUCKET       (required)  e.g., tempus-user-health-analyzed
#
# Input event:
#   headers: { Authorization: "Bearer <JWT>" }
#   body JSON:
#   {
#     "userId": "<email>",
#     "tasks": [
#       {
#         "name":"Workout",
#         "energy_demand":"high",
#         "frequency":3,
#         "duration_minutes":60,
#         "notes": "Avoid Monday morning; prefer Tue/Thu late afternoon"
#       },
#       {"name":"Reading","energy_demand":"low","frequency":4,"duration_minutes":45}
#     ]
#   }
#
# Output:
#   {
#     "message":"Tasks generated",
#     "scheduled_week_start":"<YYYY-MM-DD>",
#     "tasks":[ ... ]  # array of scheduled task objects
#   }

import json
import os
import urllib.request
import urllib.error
import urllib.parse
from openai import OpenAI
import traceback
import datetime
import boto3

# ---------- Env / clients ----------
OPENAI_API_KEY  = os.getenv("OPENAI_API_KEY")
API_BASE_URL    = os.getenv("DATABASE_API_URL")
ANALYZED_BUCKET = os.getenv("ANALYZED_BUCKET")

if not OPENAI_API_KEY:
    raise RuntimeError("OPENAI_API_KEY env var is required")
if not API_BASE_URL:
    raise RuntimeError("DATABASE_API_URL env var is required")
if not ANALYZED_BUCKET:
    raise RuntimeError("ANALYZED_BUCKET env var is required")

client = OpenAI(api_key=OPENAI_API_KEY)
s3     = boto3.client("s3")

WEEK_ORDER = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
REQUIRED_TASK_FIELDS = {
    "task_name","task_day","task_description",
    "task_start_date","task_end_date",
    "task_start_time","task_end_time",
    "task_energy_level"
}

# ---------- Date helpers ----------
def _now():
    return datetime.datetime.now()

def _today_context(now: datetime.datetime):
    return now.strftime("%A %d.%m.%y at %H:%M")

def _next_sunday(now: datetime.datetime):
    # Sunday-based week; if today is Sunday, take the next one
    days_ahead = 6 - now.weekday() if now.weekday() != 6 else 7
    return now + datetime.timedelta(days=days_ahead)

def _iso_date(d: datetime.datetime):
    return d.strftime("%Y-%m-%d")

def _context_str(d: datetime.datetime):
    return d.strftime("%A %d.%m.%y at %H:%M")

# ---------- S3 helper ----------
def _fetch_analyzed_from_s3(user_id: str):
    """
    Reads: s3://ANALYZED_BUCKET/users/{user_id}/analyzed/latest.json
    Returns parsed dict or None if missing.
    """
    key = f"users/{user_id}/analyzed/latest.json"
    try:
        obj = s3.get_object(Bucket=ANALYZED_BUCKET, Key=key)
        return json.loads(obj["Body"].read())
    except s3.exceptions.NoSuchKey:
        print(f"Analyzed file not found: s3://{ANALYZED_BUCKET}/{key}")
        return None
    except Exception as e:
        print(f"Failed reading analyzed data: {e}")
        return None

# ---------- API helper (occupied tasks) ----------
def _fetch_occupied_tasks(token: str, start_date_iso: str, days: int = 7):
    """
    Fetch existing events from your API (if token invalid, returns []).
    GET {API_BASE_URL}/tasks/from/{start_date_iso}?days=7
    """
    url = f"{API_BASE_URL}/tasks/from/{start_date_iso}?days={days}"
    try:
        req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
        with urllib.request.urlopen(req, timeout=8) as response:
            data = response.read().decode()
            parsed = json.loads(data)
            return parsed.get("tasksArr", [])
    except Exception as e:
        print("Failed to fetch occupied tasks:", str(e))
        return []

# ---------- Prompt helpers ----------
def _format_health_for_prompt(analyzed: dict) -> str:
    if not analyzed or "gpt_week_summary" not in analyzed:
        return "No analyzed health summary was found.\n"

    lines = []
    lines.append("Analyzed health summary by weekday (0–100 scale):")
    gws = analyzed["gpt_week_summary"]
    for wd in WEEK_ORDER:
        if wd not in gws:
            continue
        row = gws[wd]
        ss  = row.get("sleep_score")
        phy = row.get("physical")
        foc = row.get("focus")
        blocks = row.get("best_focus_blocks", [])
        lines.append(f"- {wd}: Sleep={ss}, Physical={phy}, Focus={foc}")
        if blocks:
            top = ", ".join(f"{b['label']}({b['score']:.2f})" for b in blocks[:2])
            lines.append(f"    Best focus blocks: {top}")
    return "\n".join(lines) + "\n"

def _format_occupied(occupied_by_day: dict) -> str:
    out = []
    if occupied_by_day:
        for day, events in occupied_by_day.items():
            out.append(day + ":")
            for e in events:
                out.append(f"- {e}")
    else:
        out.append("(none)")
    return "\n".join(out)

def _get_task_notes(t: dict):
    for k in ("notes","constraints","instructions","extra","extra_text"):
        v = t.get(k)
        if v:
            return str(v)
    return None

# ---------- JSON helpers ----------
def _extract_json_payload(s: str):
    if not s:
        return None
    try:
        return json.loads(s)
    except Exception:
        pass
    stripped = s.strip()
    if stripped.startswith("```"):
        stripped = stripped.strip("`")
        if stripped.lower().startswith("json"):
            stripped = stripped[4:].strip()
    try:
        return json.loads(stripped)
    except Exception:
        pass
    first = min([i for i in [s.find("{"), s.find("[")] if i != -1], default=-1)
    if first >= 0:
        try:
            return json.loads(s[first:])
        except Exception:
            pass
    return None

def _normalize_tasks(parsed):
    """
    Accepts:
      - a list of tasks (bare array)  -> returns that list
      - a dict with 'schedule'|'tasks'|'plan'|'agenda'|'entries' list -> returns that list
      - a single task dict with all REQUIRED_TASK_FIELDS -> returns [dict]
    """
    if isinstance(parsed, list):
        return parsed
    if isinstance(parsed, dict):
        for k in ("scheduled_tasks", "schedule", "tasks", "plan", "agenda", "entries"):
            v = parsed.get(k)
            if isinstance(v, list):
                return v
        if REQUIRED_TASK_FIELDS.issubset(parsed.keys()):
            return [parsed]
    raise ValueError("Model output is not a task array or recognized wrapper with a task list")

# ---------- Lambda entry ----------
def lambda_handler(event, context):
    try:
        print("Lambda triggered.")

        # Auth header (for occupied slots only)
        headers = event.get("headers", {}) if isinstance(event, dict) else {}
        auth_header = headers.get("Authorization") or headers.get("authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            print("Missing or invalid Authorization header")
            return {
                'statusCode': 401,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Missing or invalid Authorization header'})
            }
        token = auth_header.replace("Bearer ", "")
        print(f"Token length: {len(token)}")
        print("JWT received and extracted.")

        # Body
        body_raw = event.get("body")
        body = json.loads(body_raw) if isinstance(body_raw, str) else (body_raw or {})
        user_id = body.get("userId")
        tasks_input = body.get("tasks")

        if not user_id:
            raise ValueError("Missing 'userId' in request payload.")
        if not tasks_input or not isinstance(tasks_input, list):
            raise ValueError("Missing or invalid 'tasks' list in request payload.")

        # Time context
        now = _now()
        today_context = _today_context(now)
        ns = _next_sunday(now)
        next_sunday_str = _iso_date(ns)
        next_sunday_context = _context_str(ns)

        # Fetch analyzed health summary
        analyzed = _fetch_analyzed_from_s3(user_id)

        # Fetch occupied tasks to avoid overlap
        occupied_tasks_data = _fetch_occupied_tasks(token, next_sunday_str, days=14)

        # Build occupied map: day -> ["HH:MM:SS to HH:MM:SS - name", ...]
        occupied_by_day = {}
        for task in occupied_tasks_data:
            try:
                start_dt = datetime.datetime.fromisoformat(task["task_start_date"].replace("Z", ""))
                day_name = start_dt.strftime("%A")
            except Exception:
                day_name = task.get("task_day") or "Unknown"
            time_range = f"{task.get('task_start_time', '')} to {task.get('task_end_time', '')} - {task.get('task_name', '')}"
            occupied_by_day.setdefault(day_name, []).append(time_range)

        # Build prompt: always schedule ALL provided tasks; include per-task notes if present.
        prompt_parts = []
        prompt_parts.append(f"Today is {today_context}. Schedule starts on {next_sunday_context}.\n")
        prompt_parts.append(_format_health_for_prompt(analyzed))
        prompt_parts.append("Tasks to schedule for the upcoming week:")
        for t in tasks_input:
            line = f"- {t['name']} (Energy Demand: {t['energy_demand']}, Frequency: {t['frequency']} per week, Duration: {t['duration_minutes']} minutes)"
            notes = _get_task_notes(t)
            if notes:
                line += f"  [NOTES: {notes}]"
            prompt_parts.append(line)

        prompt_parts.append("\nAlready occupied time slots (do not overlap with these):")
        prompt_parts.append(_format_occupied(occupied_by_day))

        prompt_parts.append(f"""
Instructions:
- The week starts on Sunday (Jewish convention).
- Weekend is Friday–Saturday (if asking for weekend—schedule on one of them).

Score guide (use in placement & in task_description):
• sleep_score (0–100): Higher = more rested. Mostly sleep duration (best ≈8h) with a small bonus for REM+DEEP share.
• physical (0–100): Higher = more capacity for high-energy tasks. It’s the inverse of daily strain from steps, active calories, and training load. After heavy days (low physical), prefer lighter tasks or rest.
• focus (0–100): Higher = better for cognitively demanding work. Driven by HRV↑, resting HR↓, sleep, and low sleep-debt/strain.
• best_focus_blocks: Top non-overlapping 2-hour windows between 08:00–22:00 derived from HRV/HR. Prefer these for deep work.

- Use HEALTH_JSON signals to place tasks intelligently.
- Use OCCUPIED_JSON (day -> lines like "HH:MM:SS to HH:MM:SS - name") and DO NOT overlap those.
- Keep in mind: scores of ~60 are weak, ~80 medium, ~90 strong.
- For TASKS_JSON items: 'name', 'energy_demand', 'frequency', 'duration_minutes'.
- Schedule each task from tasks to schedule during the next 7 days starting {next_sunday_str}.
- Don't schedule tasks you get from occupied tasks!!!
- Try to put tasks with the same kind on different days.
- Assign concrete 24h times for each occurrence; distribute occurrences across the week.
- Match the day to the correct date (week starts {next_sunday_str} and ends Saturday of that same week).
- Avoid stacking multiple high-energy tasks on the same day; keep rest days between high-physical tasks.
- If a task line contains [NOTES: ...], TREAT THOSE AS HARD USER CONSTRAINTS/PREFERENCES!!!! Honour them strictly unless doing so would overlap OCCUPIED_JSON or is impossible; in that case, choose the closest feasible alternative and keep the spirit of the notes.

- For EACH returned item, the "task_description" MUST briefly justify the slot with NUMBERS from HEALTH_JSON for that weekday:
  • Cognitive tasks: reference "focus" (e.g., "Focus 92") and the exact best_focus_block label if used (e.g., "10:00–12:00").
  • Physical tasks: reference "physical" (e.g., "Physical 88") and mention spacing from other hard days.
  • Optionally mention "sleep_score" if it supports the choice (e.g., "Sleep 86 → well-rested").
  • Avoid vague phrases without numbers.

- Output strictly JSON with a top-level "tasks" array (no prose). Each item must follow:
  {{
    "task_name": "Homework in Algebra",
    "task_day": "Monday",
    "task_description": "Why this slot fits (reference health data/notes when relevant).",
    "task_start_date": "<YYYY-MM-DD>",
    "task_end_date": "<YYYY-MM-DD>",
    "task_start_time": "15:00:00",
    "task_end_time": "19:00:00",
    "task_energy_level": 75,
    "task_duration_minutes": 240
  }}
""")


        prompt = "\n".join(prompt_parts)
        print("Sending prompt to OpenAI...")

        # ----- OpenAI call -----
        response = client.chat.completions.create(
            model="gpt-4.1",
            messages=[
                {"role": "system", "content":
                    'You are a health-aware productivity AI that outputs ONLY JSON with a top-level key "tasks": {"tasks":[...]}'
                },
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=2000,
        )

        gpt_reply = (response.choices[0].message.content or "").strip()
        print("GPT reply (raw):")
        print(repr(gpt_reply))
        if not gpt_reply:
            raise ValueError("OpenAI returned empty response")

        parsed_response = _extract_json_payload(gpt_reply)
        if parsed_response is None:
            raise ValueError("Model did not return valid JSON")

        tasks = _normalize_tasks(parsed_response)
        print(f"Received {len(tasks)} scheduled task(s). Returning to client — no DB writes.")

        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'message': 'Tasks generated',
                'scheduled_week_start': next_sunday_str,
                'tasks': tasks
            })
        }

    except Exception as e:
        print("Unexpected error:", str(e))
        traceback.print_exc()
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)})
        }

# lambda_function.py — Raw uploader with immediate promotion to latest.json
import json
import boto3
import logging
from datetime import datetime, timezone
from typing import Dict, Any

logger = logging.getLogger()
logger.setLevel(logging.INFO)

s3_client = boto3.client('s3')

# ---------- CONFIG ----------
BUCKET_NAME = 'tempus-user-health-uploads'     # raw bucket (unchanged)

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Upload health data to S3:
      - Always write/merge into users/{user}/raw/staging.json  (rolling)
      - Always write history backup users/{user}/raw/history/<timestamp>.json
      - Always update latest.json with current staging data (immediate promotion)
    """
    logger.info(f"Received event: {json.dumps(event)[:2000]}")

    try:
        # Parse body (supports API Gateway proxy where body is a JSON string)
        if isinstance(event.get('body'), str):
            body = json.loads(event['body'])
        else:
            body = event.get('body', {})

        user_id = body.get('userId')
        health_data = body.get('healthData')

        if not user_id or not health_data:
            return _resp(400, {
                'error': 'Missing userId or healthData'
            })

        timestamp_for_keys = now_iso().replace(':', '-').replace('.', '-')

        # Keys
        keys = {
            'staging': f'users/{user_id}/raw/staging.json',
            'latest':  f'users/{user_id}/raw/latest.json',
            'history': f'users/{user_id}/raw/history/{timestamp_for_keys}.json'
        }

        # Add metadata into payload we store
        data_to_store = {
            **health_data,
            'uploadedAt': now_iso(),
            'lambdaRequestId': getattr(context, "aws_request_id", "unknown")
        }

        # 1) Merge into STAGING (rolling)
        merged_staging = merge_with_staging(user_id, data_to_store, keys)
        merged_staging_json = json.dumps(merged_staging, indent=2)

        s3_client.put_object(
            Bucket=BUCKET_NAME,
            Key=keys['staging'],
            Body=merged_staging_json,
            ContentType='application/json',
            Metadata={
                'userId': user_id,
                'lastUpdated': timestamp_for_keys,
                'dataPoints': str(count_data_points(merged_staging))
            }
        )
        logger.info(f"Updated staging: {keys['staging']}")

        # 2) Write HISTORY (original unmerged upload)
        s3_client.put_object(
            Bucket=BUCKET_NAME,
            Key=keys['history'],
            Body=json.dumps(data_to_store, indent=2),
            ContentType='application/json',
            Metadata={
                'userId': user_id,
                'uploadTime': timestamp_for_keys
            }
        )
        logger.info(f"Saved history backup: {keys['history']}")

        # 3) ALWAYS update latest.json with current staging data
        s3_client.put_object(
            Bucket=BUCKET_NAME,
            Key=keys['latest'],
            Body=merged_staging_json,
            ContentType='application/json',
            Metadata={
                'userId': user_id,
                'lastUpdated': timestamp_for_keys,
                'dataPoints': str(count_data_points(merged_staging)),
                'promotedAt': now_iso()
            }
        )
        logger.info(f"Updated latest.json: {keys['latest']}")

        return _resp(200, {
            'message': 'Health data uploaded',
            'userId': user_id,
            'files': keys,
            'summary': {
                'stagingDays': len(merged_staging.get('dailyData', {})),
                'stagingDataPoints': count_data_points(merged_staging),
                'latestUpdated': True,  # Always true now
                'uploadTime': now_iso()
            }
        })

    except Exception as e:
        logger.exception("Upload failed")
        return _resp(500, {
            'error': 'Failed to upload health data',
            'details': str(e)
        })


# ---------- Helpers ----------

def _resp(status: int, obj: Dict[str, Any]) -> Dict[str, Any]:
    return {
        'statusCode': status,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps(obj)
    }

def head_object_safe(bucket: str, key: str):
    try:
        return s3_client.head_object(Bucket=bucket, Key=key)
    except s3_client.exceptions.NoSuchKey:
        return None
    except Exception:
        # Some SDKs raise ClientError instead; treat any failure as "not found" for our purposes
        return None

def get_object_json_safe(bucket: str, key: str) -> Dict[str, Any]:
    try:
        obj = s3_client.get_object(Bucket=bucket, Key=key)
        return json.loads(obj['Body'].read())
    except s3_client.exceptions.NoSuchKey:
        return {}
    except Exception:
        return {}

def merge_with_staging(user_id: str, new_data: Dict[str, Any], keys: Dict[str, str]) -> Dict[str, Any]:
    """
    Merge incoming payload into staging (rolling).
    If staging doesn't exist yet, try to seed it from latest.json; else start fresh.
    """
    # Prefer staging; if missing, fallback to latest
    existing = get_object_json_safe(BUCKET_NAME, keys['staging'])
    if not existing:
        existing = get_object_json_safe(BUCKET_NAME, keys['latest']) or {}

    return merge_health_data(existing, new_data)

def merge_health_data(existing: Dict[str, Any], new_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Merge strategy:
      - Keep all historical days
      - For overlapping dates, latest upload wins
      - Keep up to 30 most-recent days
    Expects schema with key 'dailyData': { 'YYYY-MM-DD': {...} }
    """
    MAX_DAYS_TO_KEEP = 30

    merged = {
        **existing,
        **{k: v for k, v in new_data.items() if k != 'dailyData'},  # new top-level fields (except dailyData)
        'mergeInfo': {
            'lastMerged': now_iso(),
            'previousUpload': existing.get('uploadedAt')
        }
    }

    if 'dailyData' in existing or 'dailyData' in new_data:
        merged_daily = {}
        merged_daily.update(existing.get('dailyData', {}))
        merged_daily.update(new_data.get('dailyData', {}))  # new data overrides overlaps

        # keep only the most recent MAX_DAYS_TO_KEEP by date key
        sorted_dates = sorted(merged_daily.keys(), reverse=True)[:MAX_DAYS_TO_KEEP]
        merged['dailyData'] = {d: merged_daily[d] for d in sorted_dates}

    return merged

def count_data_points(data: Dict[str, Any]) -> int:
    """
    Rough count for summary/debug. Supports:
      dailyData[date] may hold primitives (e.g., steps: int) or nested dicts (e.g., steps: {total, hourly})
    """
    cnt = 0
    daily = data.get('dailyData', {})
    for day_data in daily.values():
        if not isinstance(day_data, dict):
            continue
        # Sleep samples array (if present)
        if isinstance(day_data.get('sleep'), list):
            cnt += len(day_data['sleep'])
        # Heart rate arrays
        if isinstance(day_data.get('heartRate'), list):
            cnt += len(day_data['heartRate'])
        if isinstance(day_data.get('restingHeartRate'), list):
            cnt += len(day_data['restingHeartRate'])
        # Steps (either total int or nested)
        steps = day_data.get('steps')
        if isinstance(steps, dict):
            cnt += 1 if steps.get('total') else 0
        elif isinstance(steps, (int, float)):
            cnt += 1
    return cnt
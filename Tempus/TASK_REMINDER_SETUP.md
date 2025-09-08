# Task Reminder System Setup

This document explains how to set up the database-driven task reminder system.

## Architecture Overview

1. **scheduleTaskReminder Lambda**: Stores reminder records in database when tasks are created/updated
2. **checkTaskReminders Lambda**: Runs every minute to check for due reminders and send notifications
3. **task_reminders table**: Database table storing all pending reminders
4. **EventBridge cron rule**: Triggers checkTaskReminders Lambda every minute

## Setup Steps

### 1. Create Database Table
Run the SQL script to create the task_reminders table:
```sql
-- Execute: database/create_task_reminders_table.sql
```

### 2. Deploy Lambda Functions
- **checkTaskReminders.js** - New Lambda function
- **scheduleTaskReminder.js** - Modified existing function

### 3. Create EventBridge Cron Rule

**AWS Console Steps:**
1. Go to **Amazon EventBridge** → **Rules**
2. Click **Create rule**
3. **Rule details:**
   - Name: `task-reminder-checker`
   - Description: `Triggers checkTaskReminders Lambda every minute`
   - Event bus: `default`
   - Rule type: `Schedule`

4. **Schedule pattern:**
   - Schedule type: `Rate-based schedule`
   - Rate expression: `rate(1 minute)`

5. **Select target:**
   - Target type: `AWS service`
   - Select target: `Lambda function`
   - Function: `checkTaskReminders`

6. **Review and create**

### 4. Test the System

**Create a Test Task:**
```bash
# Create a task that starts in 10 minutes with reminders enabled
# This will create reminder records in the database

# Check the database:
SELECT * FROM task_reminders WHERE is_sent = false;

# Watch the checkTaskReminders Lambda logs every minute
```

## How It Works

### When Task is Created/Updated:
1. App calls `scheduleTaskReminder` Lambda
2. Lambda calculates reminder time (5 minutes before task)
3. Inserts single record into `task_reminders` table
4. Returns success to app

### Every Minute:
1. EventBridge triggers `checkTaskReminders` Lambda
2. Lambda queries for reminders where `reminder_datetime <= NOW() AND is_sent = false`
3. For each due reminder:
   - Calls `sendExpoNotification` Lambda
   - Marks reminder as sent (`is_sent = true`)
4. Process continues every minute

### Database Schema (Simplified):
```sql
task_reminders:
- reminder_id (PK)
- task_id 
- user_id
- task_name
- task_start_datetime
- reminder_datetime  -- When to send reminder
- minutes_before     -- Default: 5 (configurable for future)
- is_sent           -- false until sent
- sent_at           -- timestamp when sent
- created_at/updated_at
```

## Benefits of This Approach

✅ **Reliable**: Database-driven, no lost reminders  
✅ **Scalable**: One EventBridge rule handles all reminders  
✅ **Debuggable**: Can query database to see pending reminders  
✅ **Lab-friendly**: Simple cron rule works in restricted environments  
✅ **Maintainable**: Easy to modify reminder intervals or logic  

## Monitoring

**Check pending reminders:**
```sql
SELECT COUNT(*) FROM task_reminders WHERE is_sent = false;
```

**Check recent notifications:**
```sql
SELECT * FROM task_reminders 
WHERE sent_at >= NOW() - INTERVAL '1 hour' 
ORDER BY sent_at DESC;
```

**Lambda logs to monitor:**
- `checkTaskReminders` - Shows every minute execution
- `scheduleTaskReminder` - Shows when reminders are scheduled
- `sendExpoNotification` - Shows actual notification sending
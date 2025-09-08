-- Migration script to update existing task_reminders table
-- Run this if you already have the table with reminder_type column

-- Step 1: Remove the redundant reminder_type column
ALTER TABLE task_reminders DROP COLUMN IF EXISTS reminder_type;

-- Step 2: Set default value for minutes_before (if not already set)
ALTER TABLE task_reminders ALTER COLUMN minutes_before SET DEFAULT 5;

-- Step 3: Update any existing records to have proper minutes_before values
-- (in case there are any null or invalid values)
UPDATE task_reminders 
SET minutes_before = 5 
WHERE minutes_before IS NULL OR minutes_before <= 0;

-- Verification query - check the updated schema
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'task_reminders' 
-- ORDER BY ordinal_position;
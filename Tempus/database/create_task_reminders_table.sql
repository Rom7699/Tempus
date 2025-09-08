-- Task Reminders Table (Simplified)
-- Stores all task reminders that need to be sent
-- Lambda checks this table every minute for due reminders
-- Default: 5 minutes before task start time

CREATE TABLE IF NOT EXISTS task_reminders (
    reminder_id SERIAL PRIMARY KEY,
    task_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    task_name VARCHAR(500) NOT NULL,
    task_start_datetime TIMESTAMP NOT NULL,
    reminder_datetime TIMESTAMP NOT NULL,
    minutes_before INTEGER NOT NULL DEFAULT 5, -- Default 5 minutes before
    is_sent BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
    
    -- Foreign key constraint removed - add manually if needed
    -- FOREIGN KEY (task_id) REFERENCES tasks(task_id) ON DELETE CASCADE
);

-- Create indexes separately for performance
CREATE INDEX IF NOT EXISTS idx_task_reminders_due ON task_reminders (reminder_datetime, is_sent);
CREATE INDEX IF NOT EXISTS idx_task_reminders_task ON task_reminders (task_id);  
CREATE INDEX IF NOT EXISTS idx_task_reminders_user ON task_reminders (user_id);

-- Comments for clarity
COMMENT ON TABLE task_reminders IS 'Stores task reminders to be processed by scheduled Lambda';
COMMENT ON COLUMN task_reminders.reminder_datetime IS 'When this reminder should be sent';
COMMENT ON COLUMN task_reminders.is_sent IS 'Whether this reminder has been sent';
COMMENT ON COLUMN task_reminders.minutes_before IS 'Minutes before task start (default: 5)';
-- Create notification_logs table for tracking sent notifications
CREATE TABLE IF NOT EXISTS notification_logs (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    notification_type VARCHAR(100) NOT NULL DEFAULT 'general',
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    push_token TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    expo_ticket_id VARCHAR(255),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance and analytics
CREATE INDEX IF NOT EXISTS idx_notification_logs_user_id ON notification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_notification_type ON notification_logs(notification_type);
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON notification_logs(status);
CREATE INDEX IF NOT EXISTS idx_notification_logs_created_at ON notification_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_notification_logs_expo_ticket_id ON notification_logs(expo_ticket_id);

-- Add comments for documentation
COMMENT ON TABLE notification_logs IS 'Logs all sent push notifications for analytics and debugging';
COMMENT ON COLUMN notification_logs.user_id IS 'Cognito user ID who received the notification';
COMMENT ON COLUMN notification_logs.notification_type IS 'Type: general, reminder, goal_completed, etc.';
COMMENT ON COLUMN notification_logs.status IS 'Status: sent, failed, delivered, etc.';
COMMENT ON COLUMN notification_logs.expo_ticket_id IS 'Expo push service ticket ID for tracking';
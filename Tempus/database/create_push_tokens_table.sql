-- Create user_push_tokens table for storing device push notification tokens
CREATE TABLE IF NOT EXISTS user_push_tokens (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    push_token TEXT NOT NULL,
    token_type VARCHAR(50) NOT NULL DEFAULT 'expo',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint
    UNIQUE(user_id, token_type)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_push_tokens_user_id ON user_push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_user_push_tokens_token_type ON user_push_tokens(token_type);
CREATE INDEX IF NOT EXISTS idx_user_push_tokens_is_active ON user_push_tokens(is_active);

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_push_tokens_updated_at 
    BEFORE UPDATE ON user_push_tokens 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE user_push_tokens IS 'Stores push notification tokens for users';
COMMENT ON COLUMN user_push_tokens.user_id IS 'Cognito user ID from JWT token';
COMMENT ON COLUMN user_push_tokens.push_token IS 'Device push notification token (Expo/FCM/APNS)';
COMMENT ON COLUMN user_push_tokens.token_type IS 'Type of token: expo, fcm, apns';
COMMENT ON COLUMN user_push_tokens.is_active IS 'Whether the token is still valid/active';
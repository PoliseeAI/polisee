-- Migration: Add User Preferences Table
-- Description: Creates user_preferences table for storing notification settings, privacy preferences, and profile data

-- Create user_preferences table
CREATE TABLE user_preferences (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Notification preferences
    notify_analysis_complete BOOLEAN NOT NULL DEFAULT true,
    notify_weekly_digest BOOLEAN NOT NULL DEFAULT false,
    notify_new_features BOOLEAN NOT NULL DEFAULT true,
    
    -- Privacy preferences
    data_retention_enabled BOOLEAN NOT NULL DEFAULT true,
    analytics_enabled BOOLEAN NOT NULL DEFAULT false,
    
    -- Profile preferences
    first_name TEXT,
    last_name TEXT,
    bio TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one preferences record per user
    UNIQUE(user_id)
);

-- Create index for better performance
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_preferences
CREATE POLICY "Users can view their own preferences" ON user_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences" ON user_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences" ON user_preferences
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own preferences" ON user_preferences
    FOR DELETE USING (auth.uid() = user_id);

-- Create function to update user preferences updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_user_preferences_updated_at();

-- Create function to initialize user preferences with defaults
CREATE OR REPLACE FUNCTION initialize_user_preferences()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_preferences (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically create preferences when user signs up
-- Note: This trigger is on auth.users which requires elevated permissions
-- You may need to create this manually in Supabase dashboard or via service role
-- CREATE TRIGGER initialize_user_preferences_on_signup
--     AFTER INSERT ON auth.users
--     FOR EACH ROW
--     EXECUTE FUNCTION initialize_user_preferences();

-- Add comment for documentation
COMMENT ON TABLE user_preferences IS 'Stores user notification preferences, privacy settings, and profile information';
COMMENT ON COLUMN user_preferences.notify_analysis_complete IS 'Whether user wants notifications when analysis is complete';
COMMENT ON COLUMN user_preferences.notify_weekly_digest IS 'Whether user wants weekly digest emails';
COMMENT ON COLUMN user_preferences.notify_new_features IS 'Whether user wants notifications about new features';
COMMENT ON COLUMN user_preferences.data_retention_enabled IS 'Whether to automatically delete session data after 24 hours';
COMMENT ON COLUMN user_preferences.analytics_enabled IS 'Whether user consents to anonymous analytics collection'; 
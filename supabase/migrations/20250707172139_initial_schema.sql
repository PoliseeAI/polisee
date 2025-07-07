-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create user_sessions table
CREATE TABLE user_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_token TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create personas table
CREATE TABLE personas (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id UUID REFERENCES user_sessions(id) ON DELETE CASCADE,
    
    -- Demographics
    location TEXT NOT NULL,
    age INTEGER NOT NULL CHECK (age >= 18 AND age <= 120),
    occupation TEXT NOT NULL,
    
    -- Family & Household
    dependents INTEGER NOT NULL DEFAULT 0 CHECK (dependents >= 0),
    income_bracket TEXT NOT NULL,
    
    -- Business & Employment
    business_type TEXT,
    employee_count INTEGER CHECK (employee_count > 0),
    
    -- Health & Benefits
    has_health_insurance BOOLEAN NOT NULL DEFAULT false,
    has_medicare BOOLEAN NOT NULL DEFAULT false,
    has_social_security BOOLEAN NOT NULL DEFAULT false,
    
    -- Education & Community
    school_district TEXT,
    has_higher_education BOOLEAN NOT NULL DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '24 hours')
);

-- Create user_feedback table
CREATE TABLE user_feedback (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    session_id UUID REFERENCES user_sessions(id) ON DELETE SET NULL,
    analysis_id UUID, -- Reference to analysis (will be created later)
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    feedback_type TEXT NOT NULL CHECK (feedback_type IN ('general', 'accuracy', 'usability', 'feature_request')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create usage_analytics table
CREATE TABLE usage_analytics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    session_id UUID REFERENCES user_sessions(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    event_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create export_history table
CREATE TABLE export_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    session_id UUID REFERENCES user_sessions(id) ON DELETE SET NULL,
    analysis_id UUID NOT NULL, -- Reference to analysis
    export_type TEXT NOT NULL CHECK (export_type IN ('pdf', 'csv', 'json')),
    file_path TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX idx_personas_user_id ON personas(user_id);
CREATE INDEX idx_personas_session_id ON personas(session_id);
CREATE INDEX idx_personas_expires_at ON personas(expires_at);
CREATE INDEX idx_user_feedback_user_id ON user_feedback(user_id);
CREATE INDEX idx_user_feedback_session_id ON user_feedback(session_id);
CREATE INDEX idx_usage_analytics_user_id ON usage_analytics(user_id);
CREATE INDEX idx_usage_analytics_session_id ON usage_analytics(session_id);
CREATE INDEX idx_usage_analytics_event_type ON usage_analytics(event_type);
CREATE INDEX idx_export_history_user_id ON export_history(user_id);
CREATE INDEX idx_export_history_session_id ON export_history(session_id);

-- Enable Row Level Security (RLS)
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- User sessions: Users can only access their own sessions
CREATE POLICY "Users can view their own sessions" ON user_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sessions" ON user_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions" ON user_sessions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions" ON user_sessions
    FOR DELETE USING (auth.uid() = user_id);

-- Personas: Users can access their own personas or session-based personas
CREATE POLICY "Users can view their own personas" ON personas
    FOR SELECT USING (auth.uid() = user_id OR session_id IS NOT NULL);

CREATE POLICY "Users can insert personas" ON personas
    FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update their own personas" ON personas
    FOR UPDATE USING (auth.uid() = user_id OR session_id IS NOT NULL);

CREATE POLICY "Users can delete their own personas" ON personas
    FOR DELETE USING (auth.uid() = user_id OR session_id IS NOT NULL);

-- User feedback: Users can access their own feedback
CREATE POLICY "Users can view their own feedback" ON user_feedback
    FOR SELECT USING (auth.uid() = user_id OR session_id IS NOT NULL);

CREATE POLICY "Users can insert feedback" ON user_feedback
    FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Usage analytics: Users can access their own analytics
CREATE POLICY "Users can view their own analytics" ON usage_analytics
    FOR SELECT USING (auth.uid() = user_id OR session_id IS NOT NULL);

CREATE POLICY "Users can insert analytics" ON usage_analytics
    FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Export history: Users can access their own export history
CREATE POLICY "Users can view their own export history" ON export_history
    FOR SELECT USING (auth.uid() = user_id OR session_id IS NOT NULL);

CREATE POLICY "Users can insert export history" ON export_history
    FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Create function to clean up expired personas
CREATE OR REPLACE FUNCTION cleanup_expired_personas()
RETURNS void AS $$
BEGIN
    DELETE FROM personas WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM user_sessions WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- You can set up a cron job to run these cleanup functions daily
-- This would be done in your Supabase Dashboard > Database > Cron Jobs (if available)
-- or using pg_cron extension

-- Create signature tracking tables directly
-- This ensures the tables exist even if migration history is out of sync

-- Create letter_signatures table to track who has signed which letters
CREATE TABLE IF NOT EXISTS letter_signatures (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    letter_id UUID NOT NULL,
    user_id UUID,
    session_id UUID,
    
    -- Signature details
    signer_name TEXT NOT NULL,
    signer_email TEXT,
    signer_location TEXT,
    
    -- Tracking
    ip_address INET,
    user_agent TEXT,
    signed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one signature per user per letter
    UNIQUE(letter_id, user_id),
    UNIQUE(letter_id, session_id),
    
    -- Ensure either user_id or session_id is provided
    CHECK (user_id IS NOT NULL OR session_id IS NOT NULL)
);

-- Create letter_signature_analytics table for tracking signature campaigns
CREATE TABLE IF NOT EXISTS letter_signature_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    letter_id UUID NOT NULL,
    
    -- Campaign metrics
    total_signatures INTEGER DEFAULT 0,
    target_signatures INTEGER DEFAULT 100,
    campaign_status TEXT DEFAULT 'active' CHECK (campaign_status IN ('active', 'sent', 'closed')),
    
    -- Timestamps
    campaign_started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    campaign_sent_at TIMESTAMP WITH TIME ZONE,
    last_signature_at TIMESTAMP WITH TIME ZONE,
    
    -- Ensure one analytics record per letter
    UNIQUE(letter_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_letter_signatures_letter_id ON letter_signatures(letter_id);
CREATE INDEX IF NOT EXISTS idx_letter_signatures_user_id ON letter_signatures(user_id);
CREATE INDEX IF NOT EXISTS idx_letter_signatures_session_id ON letter_signatures(session_id);
CREATE INDEX IF NOT EXISTS idx_letter_signatures_signed_at ON letter_signatures(signed_at);

CREATE INDEX IF NOT EXISTS idx_letter_signature_analytics_letter_id ON letter_signature_analytics(letter_id);
CREATE INDEX IF NOT EXISTS idx_letter_signature_analytics_campaign_status ON letter_signature_analytics(campaign_status);

-- Enable Row Level Security (RLS)
ALTER TABLE letter_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE letter_signature_analytics ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies

-- Analytics are publicly viewable
DROP POLICY IF EXISTS "Analytics are publicly viewable" ON letter_signature_analytics;
CREATE POLICY "Analytics are publicly viewable" ON letter_signature_analytics
    FOR SELECT USING (true);

-- Users can insert their own signatures
DROP POLICY IF EXISTS "Users can insert their own signatures" ON letter_signatures;
CREATE POLICY "Users can insert their own signatures" ON letter_signatures
    FOR INSERT WITH CHECK (true); -- Simplified for now

-- Users can view signatures
DROP POLICY IF EXISTS "Users can view signatures" ON letter_signatures;
CREATE POLICY "Users can view signatures" ON letter_signatures
    FOR SELECT USING (true); -- Simplified for now

-- Create function to update signature analytics
CREATE OR REPLACE FUNCTION update_signature_analytics()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Update or insert analytics record
        INSERT INTO letter_signature_analytics (letter_id, total_signatures, last_signature_at)
        VALUES (NEW.letter_id, 1, NEW.signed_at)
        ON CONFLICT (letter_id) 
        DO UPDATE SET 
            total_signatures = letter_signature_analytics.total_signatures + 1,
            last_signature_at = NEW.signed_at;
        
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Decrease signature count
        UPDATE letter_signature_analytics 
        SET total_signatures = GREATEST(total_signatures - 1, 0)
        WHERE letter_id = OLD.letter_id;
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update analytics
DROP TRIGGER IF EXISTS update_signature_analytics_trigger ON letter_signatures;
CREATE TRIGGER update_signature_analytics_trigger
    AFTER INSERT OR DELETE ON letter_signatures
    FOR EACH ROW
    EXECUTE FUNCTION update_signature_analytics();

-- Add comments for documentation
COMMENT ON TABLE letter_signatures IS 'Stores signatures on AI-generated letters to representatives';
COMMENT ON TABLE letter_signature_analytics IS 'Tracks signature campaign metrics and status'; 
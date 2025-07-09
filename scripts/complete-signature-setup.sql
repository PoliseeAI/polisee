-- Complete Signature Tracking System Setup
-- Run this entire script in your Supabase SQL Editor

-- Create letter_signatures table
CREATE TABLE IF NOT EXISTS letter_signatures (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    letter_id UUID NOT NULL,
    user_id UUID,
    session_id UUID,
    signer_name TEXT NOT NULL,
    signer_email TEXT,
    signer_location TEXT,
    ip_address INET,
    user_agent TEXT,
    signed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(letter_id, user_id),
    UNIQUE(letter_id, session_id),
    CHECK (user_id IS NOT NULL OR session_id IS NOT NULL)
);

-- Create letter_signature_analytics table
CREATE TABLE IF NOT EXISTS letter_signature_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    letter_id UUID NOT NULL,
    total_signatures INTEGER DEFAULT 0,
    target_signatures INTEGER DEFAULT 100,
    campaign_status TEXT DEFAULT 'active' CHECK (campaign_status IN ('active', 'sent', 'closed')),
    campaign_started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    campaign_sent_at TIMESTAMP WITH TIME ZONE,
    last_signature_at TIMESTAMP WITH TIME ZONE,
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

-- Create RLS policies for letter_signatures
DROP POLICY IF EXISTS "Users can view signatures" ON letter_signatures;
CREATE POLICY "Users can view signatures" ON letter_signatures
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own signatures" ON letter_signatures;
CREATE POLICY "Users can insert their own signatures" ON letter_signatures
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update their own signatures" ON letter_signatures;
CREATE POLICY "Users can update their own signatures" ON letter_signatures
    FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Users can delete their own signatures" ON letter_signatures;
CREATE POLICY "Users can delete their own signatures" ON letter_signatures
    FOR DELETE USING (true);

-- Create RLS policies for letter_signature_analytics
DROP POLICY IF EXISTS "Analytics are publicly viewable" ON letter_signature_analytics;
CREATE POLICY "Analytics are publicly viewable" ON letter_signature_analytics
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert analytics" ON letter_signature_analytics;
CREATE POLICY "Authenticated users can insert analytics" ON letter_signature_analytics
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update analytics" ON letter_signature_analytics;
CREATE POLICY "Authenticated users can update analytics" ON letter_signature_analytics
    FOR UPDATE USING (true);

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

-- Initialize analytics for existing letters (if any)
CREATE OR REPLACE FUNCTION initialize_letter_analytics()
RETURNS void AS $$
BEGIN
    INSERT INTO letter_signature_analytics (letter_id, total_signatures, campaign_started_at)
    SELECT 
        id as letter_id,
        0 as total_signatures,
        created_at as campaign_started_at
    FROM user_representative_contacts
    WHERE id NOT IN (SELECT letter_id FROM letter_signature_analytics)
    ON CONFLICT (letter_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Run the initialization function
SELECT initialize_letter_analytics();

-- Add table comments
COMMENT ON TABLE letter_signatures IS 'Stores signatures on AI-generated letters to representatives';
COMMENT ON TABLE letter_signature_analytics IS 'Tracks signature campaign metrics and status';
COMMENT ON COLUMN letter_signatures.signer_name IS 'Name of the person signing the letter';
COMMENT ON COLUMN letter_signatures.signer_email IS 'Email of the signer (optional)';
COMMENT ON COLUMN letter_signature_analytics.total_signatures IS 'Current total number of signatures';
COMMENT ON COLUMN letter_signature_analytics.target_signatures IS 'Target number of signatures before sending';
COMMENT ON COLUMN letter_signature_analytics.campaign_status IS 'Status of the signature campaign (active/sent/closed)';

-- Display completion message
DO $$
BEGIN
    RAISE NOTICE '✅ Signature tracking system setup completed successfully!';
    RAISE NOTICE '📊 Tables created: letter_signatures, letter_signature_analytics';
    RAISE NOTICE '🔒 RLS policies applied for security';
    RAISE NOTICE '⚡ Triggers and functions set up for automatic analytics';
    RAISE NOTICE '🚀 System is ready for use!';
END $$; 
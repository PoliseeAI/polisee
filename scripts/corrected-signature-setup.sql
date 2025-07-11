-- Corrected Signature Tracking System Setup
-- This works with your existing database schema
-- Run this in your Supabase SQL Editor

-- You already have message_signatures table, but let's enhance it if needed
-- First, check if we need to add any missing columns to message_signatures

-- Add any missing columns to existing message_signatures table
ALTER TABLE message_signatures 
ADD COLUMN IF NOT EXISTS ip_address INET,
ADD COLUMN IF NOT EXISTS user_agent TEXT,
ADD COLUMN IF NOT EXISTS signed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create analytics table for your existing generated_representative_messages
CREATE TABLE IF NOT EXISTS message_signature_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id UUID NOT NULL,
    total_signatures INTEGER DEFAULT 0,
    target_signatures INTEGER DEFAULT 100,
    campaign_status TEXT DEFAULT 'active' CHECK (campaign_status IN ('active', 'sent', 'closed')),
    campaign_started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    campaign_sent_at TIMESTAMP WITH TIME ZONE,
    last_signature_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(message_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_message_signatures_message_id ON message_signatures(message_id);
CREATE INDEX IF NOT EXISTS idx_message_signatures_user_id ON message_signatures(user_id);
CREATE INDEX IF NOT EXISTS idx_message_signatures_created_at ON message_signatures(created_at);

CREATE INDEX IF NOT EXISTS idx_message_signature_analytics_message_id ON message_signature_analytics(message_id);
CREATE INDEX IF NOT EXISTS idx_message_signature_analytics_campaign_status ON message_signature_analytics(campaign_status);

-- Enable Row Level Security (RLS) for new analytics table
ALTER TABLE message_signature_analytics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for message_signature_analytics
DROP POLICY IF EXISTS "Analytics are publicly viewable" ON message_signature_analytics;
CREATE POLICY "Analytics are publicly viewable" ON message_signature_analytics
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert analytics" ON message_signature_analytics;
CREATE POLICY "Authenticated users can insert analytics" ON message_signature_analytics
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update analytics" ON message_signature_analytics;
CREATE POLICY "Authenticated users can update analytics" ON message_signature_analytics
    FOR UPDATE USING (true);

-- Create function to update signature analytics for your existing schema
CREATE OR REPLACE FUNCTION update_message_signature_analytics()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Update or insert analytics record
        INSERT INTO message_signature_analytics (message_id, total_signatures, last_signature_at)
        VALUES (NEW.message_id, 1, COALESCE(NEW.signed_at, NEW.created_at))
        ON CONFLICT (message_id) 
        DO UPDATE SET 
            total_signatures = message_signature_analytics.total_signatures + 1,
            last_signature_at = COALESCE(NEW.signed_at, NEW.created_at);
        
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Decrease signature count
        UPDATE message_signature_analytics 
        SET total_signatures = GREATEST(total_signatures - 1, 0)
        WHERE message_id = OLD.message_id;
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update analytics
DROP TRIGGER IF EXISTS update_message_signature_analytics_trigger ON message_signatures;
CREATE TRIGGER update_message_signature_analytics_trigger
    AFTER INSERT OR DELETE ON message_signatures
    FOR EACH ROW
    EXECUTE FUNCTION update_message_signature_analytics();

-- Initialize analytics for existing messages
CREATE OR REPLACE FUNCTION initialize_message_analytics()
RETURNS void AS $$
BEGIN
    INSERT INTO message_signature_analytics (message_id, total_signatures, campaign_started_at)
    SELECT 
        id as message_id,
        0 as total_signatures,
        created_at as campaign_started_at
    FROM generated_representative_messages
    WHERE id NOT IN (SELECT message_id FROM message_signature_analytics)
    ON CONFLICT (message_id) DO NOTHING;
    
    -- Update counts for existing signatures
    UPDATE message_signature_analytics 
    SET total_signatures = (
        SELECT COUNT(*) 
        FROM message_signatures 
        WHERE message_signatures.message_id = message_signature_analytics.message_id
    );
END;
$$ LANGUAGE plpgsql;

-- Run the initialization function
SELECT initialize_message_analytics();

-- Add foreign key constraints if they don't exist
DO $$
BEGIN
    -- Add foreign key for message_signatures -> generated_representative_messages
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'message_signatures_message_id_fkey'
    ) THEN
        ALTER TABLE message_signatures 
        ADD CONSTRAINT message_signatures_message_id_fkey 
        FOREIGN KEY (message_id) REFERENCES generated_representative_messages(id) ON DELETE CASCADE;
    END IF;
    
    -- Add foreign key for message_signature_analytics -> generated_representative_messages
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'message_signature_analytics_message_id_fkey'
    ) THEN
        ALTER TABLE message_signature_analytics 
        ADD CONSTRAINT message_signature_analytics_message_id_fkey 
        FOREIGN KEY (message_id) REFERENCES generated_representative_messages(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add table comments
COMMENT ON TABLE message_signature_analytics IS 'Tracks signature campaign metrics and status for generated representative messages';
COMMENT ON COLUMN message_signature_analytics.total_signatures IS 'Current total number of signatures';
COMMENT ON COLUMN message_signature_analytics.target_signatures IS 'Target number of signatures before sending';
COMMENT ON COLUMN message_signature_analytics.campaign_status IS 'Status of the signature campaign (active/sent/closed)';

-- Display completion message
DO $$
BEGIN
    RAISE NOTICE '✅ Signature tracking system setup completed successfully!';
    RAISE NOTICE '📊 Using existing tables: generated_representative_messages, message_signatures';
    RAISE NOTICE '📈 Created analytics table: message_signature_analytics';
    RAISE NOTICE '🔒 RLS policies applied for security';
    RAISE NOTICE '⚡ Triggers and functions set up for automatic analytics';
    RAISE NOTICE '🚀 System is ready for use!';
END $$; 
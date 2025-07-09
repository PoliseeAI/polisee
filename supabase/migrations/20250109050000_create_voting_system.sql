-- Voting and Message Generation System Migration
-- This creates the infrastructure for bill voting, threshold-based message generation, and signatures

-- Create bill voting counters table
CREATE TABLE IF NOT EXISTS bill_vote_counters (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    bill_id VARCHAR(50) REFERENCES bills(bill_id) ON DELETE CASCADE,
    support_count INTEGER DEFAULT 0,
    oppose_count INTEGER DEFAULT 0,
    total_votes INTEGER GENERATED ALWAYS AS (support_count + oppose_count) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(bill_id)
);

-- Create user votes table to track individual votes
CREATE TABLE IF NOT EXISTS user_bill_votes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    bill_id VARCHAR(50) REFERENCES bills(bill_id) ON DELETE CASCADE,
    sentiment VARCHAR(10) CHECK (sentiment IN ('support', 'oppose')) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, bill_id)
);

-- Create generated messages table for AI-generated messages when thresholds are reached
CREATE TABLE IF NOT EXISTS generated_representative_messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    bill_id VARCHAR(50) REFERENCES bills(bill_id) ON DELETE CASCADE,
    sentiment VARCHAR(10) CHECK (sentiment IN ('support', 'oppose')) NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    threshold_reached INTEGER NOT NULL, -- The vote count when this was generated
    target_state VARCHAR(2), -- Optional: target specific state
    target_district INTEGER, -- Optional: target specific district
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create message signatures table
CREATE TABLE IF NOT EXISTS message_signatures (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    message_id UUID REFERENCES generated_representative_messages(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    user_email TEXT,
    location TEXT, -- User's location/state
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(message_id, user_id)
);

-- Create table to track which messages have been sent to representatives
CREATE TABLE IF NOT EXISTS sent_representative_messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    message_id UUID REFERENCES generated_representative_messages(id) ON DELETE CASCADE,
    representative_bioguide_id VARCHAR(20) NOT NULL,
    representative_name TEXT NOT NULL,
    representative_title TEXT NOT NULL,
    representative_party VARCHAR(5) NOT NULL,
    representative_state VARCHAR(2) NOT NULL,
    representative_district INTEGER,
    signature_count INTEGER NOT NULL, -- How many signatures when sent
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    delivery_status VARCHAR(20) DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'failed'))
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bill_vote_counters_bill_id ON bill_vote_counters(bill_id);
CREATE INDEX IF NOT EXISTS idx_user_bill_votes_user_id ON user_bill_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_bill_votes_bill_id ON user_bill_votes(bill_id);
CREATE INDEX IF NOT EXISTS idx_generated_messages_bill_id ON generated_representative_messages(bill_id);
CREATE INDEX IF NOT EXISTS idx_generated_messages_sentiment ON generated_representative_messages(sentiment);
CREATE INDEX IF NOT EXISTS idx_message_signatures_message_id ON message_signatures(message_id);
CREATE INDEX IF NOT EXISTS idx_sent_messages_message_id ON sent_representative_messages(message_id);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON bill_vote_counters TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_bill_votes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON generated_representative_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON message_signatures TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sent_representative_messages TO authenticated;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Initialize vote counters for existing bills
INSERT INTO bill_vote_counters (bill_id, support_count, oppose_count)
SELECT bill_id, 0, 0 FROM bills
ON CONFLICT (bill_id) DO NOTHING;

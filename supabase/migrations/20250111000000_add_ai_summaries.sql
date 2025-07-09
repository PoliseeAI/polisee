-- Migration: Add AI Bill Summaries Table
-- Description: Creates table for caching AI-generated bill summaries to avoid repeated API calls

-- Create AI summaries table
CREATE TABLE ai_bill_summaries (
    id SERIAL PRIMARY KEY,
    bill_id VARCHAR(50) NOT NULL,
    
    -- AI-generated summary sections
    what_it_does TEXT NOT NULL,
    key_changes TEXT[] NOT NULL,
    who_it_affects TEXT[] NOT NULL,
    fiscal_impact TEXT NOT NULL,
    timeline TEXT NOT NULL,
    
    -- Metadata
    model_used VARCHAR(100) NOT NULL DEFAULT 'gpt-4o-mini',
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    bill_text_hash VARCHAR(64) NOT NULL, -- SHA-256 hash of the bill text used for generation
    
    -- Ensure one AI summary per bill
    UNIQUE(bill_id),
    
    -- Foreign key to bills table
    FOREIGN KEY (bill_id) REFERENCES bills(bill_id) ON DELETE CASCADE
);

-- Create index for better performance
CREATE INDEX idx_ai_bill_summaries_bill_id ON ai_bill_summaries(bill_id);
CREATE INDEX idx_ai_bill_summaries_generated_at ON ai_bill_summaries(generated_at);

-- Enable Row Level Security (RLS)
ALTER TABLE ai_bill_summaries ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for public read access
CREATE POLICY "Public read access on ai_bill_summaries" ON ai_bill_summaries
    FOR SELECT USING (true);

-- Create policies for authenticated insert/update/delete
CREATE POLICY "Authenticated users can insert ai_bill_summaries" ON ai_bill_summaries
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update ai_bill_summaries" ON ai_bill_summaries
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete ai_bill_summaries" ON ai_bill_summaries
    FOR DELETE USING (auth.role() = 'authenticated');

-- Add comment for documentation
COMMENT ON TABLE ai_bill_summaries IS 'Stores AI-generated bill summaries to avoid repeated API calls for the same bill text';
COMMENT ON COLUMN ai_bill_summaries.bill_text_hash IS 'SHA-256 hash of the bill text used to detect if summary needs regeneration';
COMMENT ON COLUMN ai_bill_summaries.model_used IS 'AI model used to generate the summary for version tracking'; 
-- Migration to create the source_references table
CREATE TABLE IF NOT EXISTS source_references (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    bill_id VARCHAR(50) NOT NULL,
    bill_table_id INTEGER NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    
    -- Source Information
    source_type TEXT NOT NULL DEFAULT 'pdf', -- e.g., pdf, web, etc.
    source_url TEXT, -- URL to the PDF or webpage
    
    -- Location in Document
    page_number INTEGER,
    section_id VARCHAR(100),
    section_title TEXT,
    
    -- Content
    text_content TEXT NOT NULL,
    context_before TEXT,
    context_after TEXT,
    
    -- Positional Data (for highlighting in PDFs)
    coordinates JSONB, -- { "x": number, "y": number, "width": number, "height": number }
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_source_references_bill_id ON source_references(bill_id);
CREATE INDEX IF NOT EXISTS idx_source_references_bill_table_id ON source_references(bill_table_id);

-- RLS
ALTER TABLE source_references ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Source references are publicly viewable" 
ON source_references
FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage source references"
ON source_references
FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Comments for documentation
COMMENT ON TABLE source_references IS 'Stores chunks of text from bills (e.g., from PDFs) to be used as source material for AI analysis.';
COMMENT ON COLUMN source_references.coordinates IS 'Stores positional data for highlighting text within a PDF document.';

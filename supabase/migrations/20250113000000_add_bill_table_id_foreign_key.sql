-- Migration: Add bill_table_id foreign key to ai_bill_summaries
-- Description: Add proper foreign key relationship using bills.id primary key instead of bill_id string

-- Add the new foreign key column
ALTER TABLE ai_bill_summaries 
ADD COLUMN bill_table_id INTEGER;

-- Populate the new column with the correct bills.id values
UPDATE ai_bill_summaries 
SET bill_table_id = bills.id
FROM bills 
WHERE ai_bill_summaries.bill_id = bills.bill_id;

-- Add foreign key constraint
ALTER TABLE ai_bill_summaries 
ADD CONSTRAINT fk_ai_summaries_bill_table_id 
FOREIGN KEY (bill_table_id) REFERENCES bills(id) ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_ai_bill_summaries_bill_table_id ON ai_bill_summaries(bill_table_id);

-- Add NOT NULL constraint after populating the data
-- (We do this after populating to avoid issues with existing data)
ALTER TABLE ai_bill_summaries 
ALTER COLUMN bill_table_id SET NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN ai_bill_summaries.bill_table_id IS 'Foreign key to bills.id primary key - preferred over bill_id string reference'; 
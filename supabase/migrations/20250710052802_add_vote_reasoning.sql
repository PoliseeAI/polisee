-- Add reasoning field to user_bill_votes table
-- This will store why users support or oppose bills

ALTER TABLE user_bill_votes 
ADD COLUMN IF NOT EXISTS reasoning TEXT;

-- Add index for better performance when querying by bill_id and sentiment
CREATE INDEX IF NOT EXISTS idx_user_bill_votes_bill_reasoning ON user_bill_votes(bill_id, sentiment, reasoning);

-- Add comment for documentation
COMMENT ON COLUMN user_bill_votes.reasoning IS 'User explanation for why they support or oppose the bill';

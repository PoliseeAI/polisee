-- Add reasoning column to user_bill_votes table
ALTER TABLE user_bill_votes 
ADD COLUMN IF NOT EXISTS reasoning TEXT;

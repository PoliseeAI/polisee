-- Temporarily disable the problematic engagement metrics trigger
-- This will stop the UUID/text casting errors while keeping vote counters working

-- Drop the trigger that's causing UUID/text comparison errors
DROP TRIGGER IF EXISTS update_engagement_metrics_trigger ON bill_vote_counters;
DROP TRIGGER IF EXISTS trigger_update_bill_metrics ON user_bill_votes;

-- Drop the problematic function
DROP FUNCTION IF EXISTS update_bill_engagement_metrics(TEXT);
DROP FUNCTION IF EXISTS trigger_update_bill_metrics();

-- Show confirmation
SELECT 'Engagement metrics triggers disabled successfully' as status;

-- Note: The bill_engagement_metrics table still exists and can be manually updated
-- The vote counters will continue to work normally via their own trigger 
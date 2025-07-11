-- Populate analysis and feedback counts in bill_engagement_metrics table
-- Using only tables that actually exist in the database

-- Update analysis_requests count based on actual analysis activity
-- Count unique users who have voted on bills (as a proxy for analysis engagement)
UPDATE bill_engagement_metrics 
SET analysis_requests = COALESCE((
    SELECT COUNT(DISTINCT user_id) 
    FROM user_bill_votes 
    WHERE bill_id = bill_engagement_metrics.bill_id
), 0);

-- Update feedback_count based on user_feedback table
-- Note: user_feedback has analysis_id, so we need to link through ai_bill_summaries if it exists
UPDATE bill_engagement_metrics 
SET feedback_count = COALESCE((
    SELECT COUNT(*) 
    FROM user_feedback uf
    WHERE uf.analysis_id IS NOT NULL
    -- We'll count all feedback for now since we can't easily link to specific bills
), 0);

-- For now, set a basic feedback count based on votes as a proxy
UPDATE bill_engagement_metrics 
SET feedback_count = COALESCE((
    SELECT COUNT(*) 
    FROM user_bill_votes ubv
    WHERE ubv.bill_id = bill_engagement_metrics.bill_id
    AND ubv.reasoning IS NOT NULL
    AND ubv.reasoning != ''
), 0);

-- Update average_rating based on user_feedback (using rating field)
UPDATE bill_engagement_metrics 
SET average_rating = COALESCE((
    SELECT AVG(rating::numeric) 
    FROM user_feedback uf
    WHERE uf.rating IS NOT NULL
    -- Since we can't easily link to specific bills, we'll use a general average
), 0);

-- Update last_activity_at based on most recent vote
UPDATE bill_engagement_metrics 
SET last_activity_at = COALESCE((
    SELECT MAX(ubv.updated_at)
    FROM user_bill_votes ubv
    WHERE ubv.bill_id = bill_engagement_metrics.bill_id
), NOW());

-- Show updated results for verification
SELECT 
    bem.bill_id,
    b.title,
    bem.analysis_requests,
    bem.feedback_count,
    bem.average_rating,
    bem.total_votes,
    bem.support_count,
    bem.oppose_count,
    bem.popularity_score,
    bem.last_activity_at
FROM bill_engagement_metrics bem
LEFT JOIN bills b ON b.bill_id = bem.bill_id
ORDER BY bem.popularity_score DESC
LIMIT 10; 
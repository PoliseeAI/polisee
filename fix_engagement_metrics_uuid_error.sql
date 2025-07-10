-- Fix the UUID/text comparison error in the engagement metrics function

-- Drop the problematic trigger temporarily
DROP TRIGGER IF EXISTS update_engagement_metrics_trigger ON bill_vote_counters;

-- Update the function to fix the UUID/text comparison
CREATE OR REPLACE FUNCTION update_bill_engagement_metrics(p_bill_id TEXT)
RETURNS VOID AS $$
DECLARE
    bill_data RECORD;
    vote_data RECORD;
    analysis_count INTEGER := 0;
    feedback_data RECORD;
    days_since_activity INTEGER := 0;
    popularity NUMERIC := 0;
    under_radar NUMERIC := 0;
BEGIN
    -- Get bill information
    SELECT 
        cboc_estimate_url IS NOT NULL as has_fiscal_impact,
        constitutional_authority_text IS NOT NULL as has_constitutional_authority,
        policy_area,
        EXTRACT(DAYS FROM (NOW() - introduced_date::timestamp))::INTEGER as days_since_introduced
    INTO bill_data
    FROM bills 
    WHERE bill_id = p_bill_id;
    
    -- Get vote counts
    SELECT 
        COALESCE(support_count, 0) as support_count,
        COALESCE(oppose_count, 0) as oppose_count,
        COALESCE(support_count, 0) + COALESCE(oppose_count, 0) as total_votes
    INTO vote_data
    FROM bill_vote_counters
    WHERE bill_id = p_bill_id;
    
    -- Count analysis requests (approximate based on AI summaries)
    SELECT COUNT(*) INTO analysis_count
    FROM ai_bill_summaries
    WHERE bill_id = p_bill_id;
    
    -- Get feedback metrics - FIX: Cast id to text to match analysis_id type
    SELECT 
        COUNT(*) as feedback_count,
        COALESCE(AVG(rating), 0) as average_rating
    INTO feedback_data
    FROM user_feedback uf
    WHERE uf.analysis_id IN (
        SELECT id::text FROM ai_bill_summaries WHERE bill_id = p_bill_id
    );
    
    -- Calculate days since last activity
    SELECT EXTRACT(DAYS FROM (NOW() - GREATEST(
        COALESCE((SELECT MAX(created_at) FROM user_bill_votes WHERE bill_id = p_bill_id), '1970-01-01'::timestamp),
        COALESCE((SELECT MAX(generated_at) FROM ai_bill_summaries WHERE bill_id = p_bill_id), '1970-01-01'::timestamp),
        COALESCE((SELECT MAX(created_at) FROM user_feedback WHERE analysis_id IN (SELECT id::text FROM ai_bill_summaries WHERE bill_id = p_bill_id)), '1970-01-01'::timestamp)
    )))::INTEGER INTO days_since_activity;
    
    -- Calculate scores
    popularity := calculate_popularity_score(
        COALESCE(vote_data.total_votes, 0),
        analysis_count,
        COALESCE(feedback_data.feedback_count, 0),
        COALESCE(feedback_data.average_rating, 0),
        0, -- page_views (not tracked yet)
        days_since_activity
    );
    
    under_radar := calculate_under_radar_score(
        p_bill_id,
        COALESCE(vote_data.total_votes, 0),
        analysis_count,
        COALESCE(feedback_data.feedback_count, 0),
        COALESCE(bill_data.has_fiscal_impact, false),
        COALESCE(bill_data.has_constitutional_authority, false),
        bill_data.policy_area,
        days_since_activity
    );
    
    -- Update or insert the metrics
    INSERT INTO bill_engagement_metrics (
        bill_id,
        total_votes,
        support_count,
        oppose_count,
        analysis_requests,
        feedback_count,
        average_rating,
        popularity_score,
        under_radar_score,
        last_activity_at,
        updated_at
    ) VALUES (
        p_bill_id,
        COALESCE(vote_data.total_votes, 0),
        COALESCE(vote_data.support_count, 0),
        COALESCE(vote_data.oppose_count, 0),
        analysis_count,
        COALESCE(feedback_data.feedback_count, 0),
        COALESCE(feedback_data.average_rating, 0),
        popularity,
        under_radar,
        NOW(),
        NOW()
    )
    ON CONFLICT (bill_id) DO UPDATE SET
        total_votes = EXCLUDED.total_votes,
        support_count = EXCLUDED.support_count,
        oppose_count = EXCLUDED.oppose_count,
        analysis_requests = EXCLUDED.analysis_requests,
        feedback_count = EXCLUDED.feedback_count,
        average_rating = EXCLUDED.average_rating,
        popularity_score = EXCLUDED.popularity_score,
        under_radar_score = EXCLUDED.under_radar_score,
        last_activity_at = EXCLUDED.last_activity_at,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Create a simpler trigger function that doesn't cause UUID issues
CREATE OR REPLACE FUNCTION trigger_update_bill_metrics()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update if bill_engagement_metrics table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bill_engagement_metrics') THEN
        -- Use a simple approach to avoid UUID/text issues
        INSERT INTO bill_engagement_metrics (
            bill_id,
            total_votes,
            support_count,
            oppose_count,
            last_activity_at,
            updated_at
        ) VALUES (
            NEW.bill_id,
            NEW.total_votes,
            NEW.support_count,
            NEW.oppose_count,
            NOW(),
            NOW()
        )
        ON CONFLICT (bill_id) DO UPDATE SET
            total_votes = NEW.total_votes,
            support_count = NEW.support_count,
            oppose_count = NEW.oppose_count,
            popularity_score = NEW.total_votes * 2 + NEW.support_count * 1.5 + NEW.oppose_count * 1.5,
            under_radar_score = CASE 
                WHEN NEW.total_votes <= 2 THEN 75
                WHEN NEW.total_votes <= 5 THEN 60
                WHEN NEW.total_votes <= 10 THEN 45
                ELSE 20
            END,
            last_activity_at = NOW(),
            updated_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger with the fixed function
CREATE TRIGGER update_engagement_metrics_trigger
    AFTER INSERT OR UPDATE ON bill_vote_counters
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_bill_metrics();

-- Test that the trigger works by checking bill 8244
SELECT 
    'Vote counters:' as type,
    bill_id,
    support_count,
    oppose_count,
    total_votes
FROM bill_vote_counters 
WHERE bill_id = '8244'

UNION ALL

SELECT 
    'Engagement metrics:' as type,
    bill_id,
    support_count,
    oppose_count,
    total_votes
FROM bill_engagement_metrics 
WHERE bill_id = '8244'; 
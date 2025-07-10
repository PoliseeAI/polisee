-- Function to update engagement metrics when votes change
CREATE OR REPLACE FUNCTION update_engagement_metrics_on_vote()
RETURNS TRIGGER AS $$
BEGIN
    -- Update or insert engagement metrics for the bill
    INSERT INTO bill_engagement_metrics (
        bill_id, 
        total_votes, 
        support_count, 
        oppose_count, 
        popularity_score, 
        under_radar_score,
        last_activity_at
    )
    SELECT 
        NEW.bill_id,
        COALESCE(bvc.total_votes, 0),
        COALESCE(bvc.support_count, 0),
        COALESCE(bvc.oppose_count, 0),
        -- Calculate popularity score
        COALESCE(bvc.total_votes * 2, 0) + COALESCE(bvc.support_count * 1.5, 0) + COALESCE(bvc.oppose_count * 1.5, 0),
        -- Calculate under-radar score
        CASE 
            WHEN COALESCE(bvc.total_votes, 0) <= 2 AND LENGTH(b.title) > 50 THEN 75
            WHEN COALESCE(bvc.total_votes, 0) <= 5 AND b.policy_area IS NOT NULL THEN 60
            WHEN COALESCE(bvc.total_votes, 0) <= 10 THEN 45
            ELSE 20
        END,
        NOW()
    FROM bill_vote_counters bvc
    JOIN bills b ON b.bill_id = bvc.bill_id
    WHERE bvc.bill_id = NEW.bill_id
    ON CONFLICT (bill_id) DO UPDATE SET
        total_votes = EXCLUDED.total_votes,
        support_count = EXCLUDED.support_count,
        oppose_count = EXCLUDED.oppose_count,
        popularity_score = EXCLUDED.popularity_score,
        under_radar_score = EXCLUDED.under_radar_score,
        last_activity_at = NOW(),
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on bill_vote_counters table
DROP TRIGGER IF EXISTS update_engagement_metrics_trigger ON bill_vote_counters;
CREATE TRIGGER update_engagement_metrics_trigger
    AFTER INSERT OR UPDATE ON bill_vote_counters
    FOR EACH ROW
    EXECUTE FUNCTION update_engagement_metrics_on_vote();

-- Test the trigger by updating a vote counter (optional)
-- UPDATE bill_vote_counters SET support_count = support_count + 1 WHERE bill_id = '8244'; 
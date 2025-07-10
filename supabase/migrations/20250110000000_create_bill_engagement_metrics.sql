-- Create bill engagement metrics table
CREATE TABLE IF NOT EXISTS bill_engagement_metrics (
    id SERIAL PRIMARY KEY,
    bill_id TEXT NOT NULL UNIQUE REFERENCES bills(bill_id),
    
    -- Vote metrics
    total_votes INTEGER DEFAULT 0,
    support_count INTEGER DEFAULT 0,
    oppose_count INTEGER DEFAULT 0,
    vote_engagement_score NUMERIC DEFAULT 0,
    
    -- Analysis metrics
    analysis_requests INTEGER DEFAULT 0,
    last_analyzed_at TIMESTAMP WITH TIME ZONE,
    
    -- Feedback metrics
    feedback_count INTEGER DEFAULT 0,
    average_rating NUMERIC DEFAULT 0,
    
    -- Page view metrics
    page_views INTEGER DEFAULT 0,
    unique_viewers INTEGER DEFAULT 0,
    
    -- Calculated scores
    popularity_score NUMERIC DEFAULT 0,
    importance_score NUMERIC DEFAULT 0,
    under_radar_score NUMERIC DEFAULT 0,
    
    -- Timestamps
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_bill_engagement_popularity ON bill_engagement_metrics(popularity_score DESC);
CREATE INDEX idx_bill_engagement_under_radar ON bill_engagement_metrics(under_radar_score DESC);
CREATE INDEX idx_bill_engagement_bill_id ON bill_engagement_metrics(bill_id);
CREATE INDEX idx_bill_engagement_last_activity ON bill_engagement_metrics(last_activity_at DESC);

-- Create function to calculate popularity score
CREATE OR REPLACE FUNCTION calculate_popularity_score(
    total_votes INTEGER,
    analysis_requests INTEGER,
    feedback_count INTEGER,
    average_rating NUMERIC,
    page_views INTEGER,
    days_since_last_activity INTEGER
) RETURNS NUMERIC AS $$
DECLARE
    popularity NUMERIC := 0;
    recency_factor NUMERIC := 1;
BEGIN
    -- Base score from engagement metrics
    popularity := (total_votes * 2) + (analysis_requests * 1.5) + (feedback_count * 1) + (page_views * 0.1);
    
    -- Bonus for high ratings
    IF average_rating > 3.5 THEN
        popularity := popularity * 1.2;
    END IF;
    
    -- Recency factor (less weight for older activity)
    IF days_since_last_activity > 30 THEN
        recency_factor := 0.7;
    ELSIF days_since_last_activity > 7 THEN
        recency_factor := 0.9;
    END IF;
    
    popularity := popularity * recency_factor;
    
    RETURN GREATEST(popularity, 0);
END;
$$ LANGUAGE plpgsql;

-- Create function to calculate under-radar score
CREATE OR REPLACE FUNCTION calculate_under_radar_score(
    total_votes INTEGER,
    analysis_requests INTEGER,
    has_fiscal_impact BOOLEAN,
    has_constitutional_authority BOOLEAN,
    policy_area TEXT,
    days_since_introduced INTEGER
) RETURNS NUMERIC AS $$
DECLARE
    under_radar NUMERIC := 0;
    importance NUMERIC := 50;
BEGIN
    -- Start with base importance
    importance := 50;
    
    -- Add importance factors
    IF has_fiscal_impact THEN
        importance := importance + 25;
    END IF;
    
    IF has_constitutional_authority THEN
        importance := importance + 15;
    END IF;
    
    -- Policy area importance
    IF policy_area IN ('Health', 'Education', 'Energy', 'Taxation', 'National Security', 'Environment') THEN
        importance := importance + 20;
    END IF;
    
    -- Calculate engagement deficit
    IF total_votes < 5 AND analysis_requests < 10 THEN
        under_radar := importance + 30;
    ELSIF total_votes < 15 AND analysis_requests < 25 THEN
        under_radar := importance + 15;
    ELSE
        under_radar := importance - 20;
    END IF;
    
    -- Bonus for bills that have been around longer but still under-engaged
    IF days_since_introduced > 60 AND total_votes < 10 THEN
        under_radar := under_radar + 20;
    END IF;
    
    RETURN GREATEST(under_radar, 0);
END;
$$ LANGUAGE plpgsql;

-- Create function to update bill metrics
CREATE OR REPLACE FUNCTION update_bill_engagement_metrics(p_bill_id TEXT)
RETURNS VOID AS $$
DECLARE
    vote_data RECORD;
    analysis_count INTEGER := 0;
    feedback_data RECORD;
    bill_data RECORD;
    days_since_activity INTEGER;
    days_since_introduced INTEGER;
    popularity NUMERIC;
    under_radar NUMERIC;
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
    
    -- Get feedback metrics
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
        COALESCE(days_since_activity, 30)
    );
    
    under_radar := calculate_under_radar_score(
        COALESCE(vote_data.total_votes, 0),
        analysis_count,
        COALESCE(bill_data.has_fiscal_impact, false),
        COALESCE(bill_data.has_constitutional_authority, false),
        COALESCE(bill_data.policy_area, 'General'),
        COALESCE(bill_data.days_since_introduced, 0)
    );
    
    -- Upsert the metrics
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

-- Create trigger to update metrics when votes change
CREATE OR REPLACE FUNCTION trigger_update_bill_metrics()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM update_bill_engagement_metrics(NEW.bill_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers (if tables exist)
DO $$
BEGIN
    -- Only create trigger if bill_vote_counters table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bill_vote_counters') THEN
        DROP TRIGGER IF EXISTS update_bill_metrics_on_vote_change ON bill_vote_counters;
        CREATE TRIGGER update_bill_metrics_on_vote_change
            AFTER INSERT OR UPDATE ON bill_vote_counters
            FOR EACH ROW EXECUTE FUNCTION trigger_update_bill_metrics();
    END IF;
END $$; 
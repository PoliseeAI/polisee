-- Create bill engagement metrics table for dynamic popularity calculations
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
    
    -- Activity tracking
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bill_engagement_metrics_bill_id ON bill_engagement_metrics(bill_id);
CREATE INDEX IF NOT EXISTS idx_bill_engagement_metrics_popularity_score ON bill_engagement_metrics(popularity_score DESC);
CREATE INDEX IF NOT EXISTS idx_bill_engagement_metrics_under_radar_score ON bill_engagement_metrics(under_radar_score DESC);
CREATE INDEX IF NOT EXISTS idx_bill_engagement_metrics_last_activity ON bill_engagement_metrics(last_activity_at DESC);

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_bill_engagement_metrics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_bill_engagement_metrics_updated_at
    BEFORE UPDATE ON bill_engagement_metrics
    FOR EACH ROW
    EXECUTE FUNCTION update_bill_engagement_metrics_updated_at();

-- Initialize metrics for existing bills (using correct table name: bill_vote_counters)
INSERT INTO bill_engagement_metrics (bill_id, total_votes, support_count, oppose_count, popularity_score, under_radar_score)
SELECT 
    b.bill_id,
    COALESCE(bvc.total_votes, 0) as total_votes,
    COALESCE(bvc.support_count, 0) as support_count,
    COALESCE(bvc.oppose_count, 0) as oppose_count,
    -- Calculate popularity score: (total_votes * 2) + (support_count * 1.5) + (oppose_count * 1.5)
    COALESCE(bvc.total_votes * 2, 0) + COALESCE(bvc.support_count * 1.5, 0) + COALESCE(bvc.oppose_count * 1.5, 0) as popularity_score,
    -- Calculate under-radar score: bills with high importance but low engagement
    CASE 
        WHEN COALESCE(bvc.total_votes, 0) <= 2 AND LENGTH(b.title) > 50 THEN 75
        WHEN COALESCE(bvc.total_votes, 0) <= 5 AND b.policy_area IS NOT NULL THEN 60
        WHEN COALESCE(bvc.total_votes, 0) <= 10 THEN 45
        ELSE 20
    END as under_radar_score
FROM bills b
LEFT JOIN bill_vote_counters bvc ON b.bill_id = bvc.bill_id
ON CONFLICT (bill_id) DO UPDATE SET
    total_votes = EXCLUDED.total_votes,
    support_count = EXCLUDED.support_count,
    oppose_count = EXCLUDED.oppose_count,
    popularity_score = EXCLUDED.popularity_score,
    under_radar_score = EXCLUDED.under_radar_score,
    updated_at = NOW();

-- View to verify the data was inserted correctly
SELECT 
    bem.bill_id,
    b.title,
    bem.total_votes,
    bem.support_count,
    bem.oppose_count,
    bem.popularity_score,
    bem.under_radar_score,
    bem.created_at
FROM bill_engagement_metrics bem
LEFT JOIN bills b ON bem.bill_id = b.bill_id
ORDER BY bem.popularity_score DESC
LIMIT 10; 
-- Fix the vote counters trigger to properly handle vote updates

-- First, let's drop the existing trigger and recreate it
DROP TRIGGER IF EXISTS trigger_update_vote_counters ON user_bill_votes;

-- Create an improved function to update vote counters
CREATE OR REPLACE FUNCTION update_bill_vote_counters()
RETURNS TRIGGER AS $$
BEGIN
    -- Initialize counters if they don't exist
    INSERT INTO bill_vote_counters (bill_id, support_count, oppose_count)
    VALUES (COALESCE(NEW.bill_id, OLD.bill_id), 0, 0)
    ON CONFLICT (bill_id) DO NOTHING;
    
    -- Handle different operations
    IF TG_OP = 'INSERT' THEN
        -- New vote added
        IF NEW.sentiment = 'support' THEN
            UPDATE bill_vote_counters 
            SET support_count = support_count + 1, updated_at = NOW()
            WHERE bill_id = NEW.bill_id;
        ELSIF NEW.sentiment = 'oppose' THEN
            UPDATE bill_vote_counters 
            SET oppose_count = oppose_count + 1, updated_at = NOW()
            WHERE bill_id = NEW.bill_id;
        END IF;
        
    ELSIF TG_OP = 'UPDATE' THEN
        -- Vote sentiment changed
        IF OLD.sentiment != NEW.sentiment THEN
            -- Remove old vote
            IF OLD.sentiment = 'support' THEN
                UPDATE bill_vote_counters 
                SET support_count = GREATEST(support_count - 1, 0), updated_at = NOW()
                WHERE bill_id = OLD.bill_id;
            ELSIF OLD.sentiment = 'oppose' THEN
                UPDATE bill_vote_counters 
                SET oppose_count = GREATEST(oppose_count - 1, 0), updated_at = NOW()
                WHERE bill_id = OLD.bill_id;
            END IF;
            
            -- Add new vote
            IF NEW.sentiment = 'support' THEN
                UPDATE bill_vote_counters 
                SET support_count = support_count + 1, updated_at = NOW()
                WHERE bill_id = NEW.bill_id;
            ELSIF NEW.sentiment = 'oppose' THEN
                UPDATE bill_vote_counters 
                SET oppose_count = oppose_count + 1, updated_at = NOW()
                WHERE bill_id = NEW.bill_id;
            END IF;
        END IF;
        
    ELSIF TG_OP = 'DELETE' THEN
        -- Vote removed
        IF OLD.sentiment = 'support' THEN
            UPDATE bill_vote_counters 
            SET support_count = GREATEST(support_count - 1, 0), updated_at = NOW()
            WHERE bill_id = OLD.bill_id;
        ELSIF OLD.sentiment = 'oppose' THEN
            UPDATE bill_vote_counters 
            SET oppose_count = GREATEST(oppose_count - 1, 0), updated_at = NOW()
            WHERE bill_id = OLD.bill_id;
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER trigger_update_vote_counters
    AFTER INSERT OR UPDATE OR DELETE ON user_bill_votes
    FOR EACH ROW
    EXECUTE FUNCTION update_bill_vote_counters();

-- Recalculate all vote counters to fix any existing inconsistencies
UPDATE bill_vote_counters 
SET 
    support_count = (
        SELECT COUNT(*) 
        FROM user_bill_votes 
        WHERE bill_id = bill_vote_counters.bill_id 
        AND sentiment = 'support'
    ),
    oppose_count = (
        SELECT COUNT(*) 
        FROM user_bill_votes 
        WHERE bill_id = bill_vote_counters.bill_id 
        AND sentiment = 'oppose'
    ),
    updated_at = NOW();

-- Test the trigger by checking bill 8244
SELECT 
    bvc.bill_id,
    bvc.support_count,
    bvc.oppose_count,
    bvc.total_votes,
    (SELECT COUNT(*) FROM user_bill_votes WHERE bill_id = bvc.bill_id AND sentiment = 'support') as actual_support,
    (SELECT COUNT(*) FROM user_bill_votes WHERE bill_id = bvc.bill_id AND sentiment = 'oppose') as actual_oppose
FROM bill_vote_counters bvc 
WHERE bill_id = '8244'; 
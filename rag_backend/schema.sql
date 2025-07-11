-- Step 3: Create the schema objects

-- Create a function to automatically update the 'updated_at' timestamp
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Table to store the main bill information, now with a 'full_text' column
CREATE TABLE bills (
    id SERIAL PRIMARY KEY,
    congress INT NOT NULL,
    number VARCHAR(20) NOT NULL,
    type VARCHAR(10) NOT NULL,
    origin_chamber VARCHAR(50),
    title TEXT,
    url TEXT UNIQUE,
    latest_action_date DATE,
    latest_action_text TEXT,
    full_text TEXT, -- The new column for the extracted bill text
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- A bill is uniquely identified by its congress, type, and number
    UNIQUE (congress, type, number)
);

-- Create a trigger on the 'bills' table to call the function on update
CREATE TRIGGER set_timestamp_bills
BEFORE UPDATE ON bills
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();


-- Table to store bill summaries, linked to the 'bills' table (this is unchanged)
CREATE TABLE bill_summaries (
    id SERIAL PRIMARY KEY,
    bill_id INT NOT NULL,
    version_code VARCHAR(10) NOT NULL,
    action_date DATE,
    action_desc TEXT,
    text TEXT,
    update_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Foreign key relationship to the 'bills' table
    CONSTRAINT fk_bill
        FOREIGN KEY(bill_id) 
        REFERENCES bills(id)
        ON DELETE CASCADE,

    -- A summary is unique for a given bill and version code
    UNIQUE (bill_id, version_code)
);

-- Create a trigger on the 'bill_summaries' table
CREATE TRIGGER set_timestamp_bill_summaries
BEFORE UPDATE ON bill_summaries
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

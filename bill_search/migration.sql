CREATE EXTENSION IF NOT EXISTS vector;

-- Add a 'tags' column to the 'bills' table to store LLM-generated topics
ALTER TABLE bills ADD COLUMN tags TEXT[];

-- Create a new table for the text chunks and their embeddings
CREATE TABLE bill_chunks (
    id SERIAL PRIMARY KEY,
    bill_id INT NOT NULL,
    chunk_text TEXT NOT NULL,
    -- The 'vector(1536)' assumes you're using OpenAI's ada-002 or text-embedding-3-small model.
    -- Adjust the number based on your chosen embedding model's dimensions.
    embedding vector(1536),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_bill
        FOREIGN KEY(bill_id) 
        REFERENCES bills(id)
        ON DELETE CASCADE
);

-- Create an index for fast vector similarity search (optional but highly recommended for performance)
CREATE INDEX ON bill_chunks USING ivfflat (embedding vector_l2_ops) WITH (lists = 100);

CREATE EXTENSION IF NOT EXISTS vector;

-- This schema is the same as before, but its usage is now more sophisticated.
CREATE TABLE bill_chunks (
    chunk_id SERIAL PRIMARY KEY,
    section_id VARCHAR(255) NOT NULL,
    chunk_type VARCHAR(50) NOT NULL, -- e.g., 'section_summary', 'subsection_text'
    content TEXT,
    embedding vector(1536),
    bill_title TEXT,
    bill_number VARCHAR(50),
    section_number VARCHAR(50),
    section_header TEXT,
    committee TEXT,
    subtitle TEXT,
    metadata JSONB
);

CREATE INDEX ON bill_chunks USING HNSW (embedding vector_l2_ops);
CREATE INDEX ON bill_chunks (section_id);

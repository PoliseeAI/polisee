-- Make sure you have the pgvector extension installed
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE bill_sections (
    id VARCHAR(255) PRIMARY KEY,
    bill_title TEXT,
    bill_number VARCHAR(50),
    section_number VARCHAR(50),
    section_header TEXT,
    committee TEXT,
    subtitle TEXT,
    full_context_text TEXT, -- The synthesized text for the LLM
    embedding vector(1536), -- Assuming OpenAI's text-embedding-ada-002 dimension
    metadata JSONB -- For storing other useful info like cross-references
);

-- Create an index for efficient vector similarity search
CREATE INDEX ON bill_sections
USING HNSW (embedding vector_l2_ops); -- Or use IVFFLAT depending on your specific needs

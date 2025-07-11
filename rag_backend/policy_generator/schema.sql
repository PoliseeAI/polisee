-- schema.sql
--
-- This script sets up the database schema for the PolGen application's
-- Phase 1 local data backend. It should be run once against the target
-- PostgreSQL database before the data ingestion script is executed.
--
-- Command to run:
-- psql -d <database_name> -U <user_name> -f schema.sql

-- Step 1: Ensure the pgvector extension is available.
-- This extension provides the 'vector' data type and similarity search functions.
CREATE EXTENSION IF NOT EXISTS vector;


-- Step 2: Define the 'documents' table.
-- This table stores metadata about each source document we ingest.
-- We use 'DROP TABLE ... CASCADE' to ensure a clean slate if the script is
-- re-run, removing this table and any objects that depend on it (like the 'chunks' table).
DROP TABLE IF EXISTS documents CASCADE;

CREATE TABLE documents (
    -- A unique identifier for each document, generated automatically.
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- The name of the file as it appears in the 'data/' folder.
    -- e.g., 'doc1_zoning_code.pdf'. This is useful for traceability.
    file_name TEXT NOT NULL,

    -- The type of document, derived from its file extension.
    -- e.g., 'pdf', 'txt'. This helps us know how it was processed.
    document_type TEXT NOT NULL,

    -- A short, human-readable name of the source organization.
    -- This field is currently PLANNED for future use but can be left null for now.
    -- e.g., 'HUD', 'Mercatus Center'.
    source_name TEXT,

    -- A longer title of the document, if available.
    -- PLANNED for future use, can be null.
    document_title TEXT,

    -- The timestamp when this record was first created in our system.
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add comments to the table and columns for clarity.
COMMENT ON TABLE documents IS 'Stores metadata for each source document ingested from the local data folder.';
COMMENT ON COLUMN documents.id IS 'Primary key, unique identifier for a document.';
COMMENT ON COLUMN documents.file_name IS 'Original file name from the data/ directory.';
COMMENT ON COLUMN documents.document_type IS 'File extension of the source document (e.g., pdf, txt).';


-- Step 3: Define the 'chunks' table.
-- This table stores the actual text content broken down into smaller pieces,
-- along with their corresponding vector embeddings.
DROP TABLE IF EXISTS chunks;

CREATE TABLE chunks (
    -- A unique identifier for each individual text chunk.
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- A foreign key that links this chunk back to its parent document in the 'documents' table.
    -- 'ON DELETE CASCADE' means if a document is deleted, all its associated chunks are also deleted.
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,

    -- The actual text content of this chunk.
    chunk_text TEXT NOT NULL,

    -- The order of this chunk within the parent document (e.g., 0, 1, 2, ...).
    -- This is useful if we ever need to reconstruct the original document's flow.
    chunk_index INTEGER NOT NULL,

    -- The vector embedding for this chunk of text.
    -- The dimension (1536) is specific to OpenAI's 'text-embedding-3-small' model.
    -- If we change the model, we may need to change this dimension.
    embedding vector(1536),

    -- The timestamp when this chunk record was created.
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add comments to the table and columns.
COMMENT ON TABLE chunks IS 'Stores processed text chunks and their vector embeddings from source documents.';
COMMENT ON COLUMN chunks.document_id IS 'Foreign key linking to the parent document.';
COMMENT ON COLUMN chunks.chunk_text IS 'The actual text content of the processed chunk.';
COMMENT ON COLUMN chunks.chunk_index IS 'The sequential order of the chunk within the document.';
COMMENT ON COLUMN chunks.embedding IS 'The vector embedding generated from chunk_text.';


-- Step 4: Create indexes for performance.
-- Indexes are crucial for speeding up database queries.

-- Create an index on the 'document_id' in the 'chunks' table.
-- This will make it much faster to find all chunks belonging to a specific document.
CREATE INDEX idx_chunks_document_id ON chunks(document_id);

-- Create a vector index on the 'embedding' column.
-- This is THE most important step for performance. It enables fast approximate
-- nearest neighbor (ANN) searches, which is how we find relevant chunks.
-- Without this, vector searches on large tables would be extremely slow (full table scan).
-- We use IVFFlat, a common and effective index type for vector similarity search.
-- 'vector_l2_ops' specifies we are using Euclidean L2 distance for similarity.
CREATE INDEX idx_chunks_embedding ON chunks USING ivfflat (embedding vector_l2_ops) WITH (lists = 100);

-- The 'lists' parameter is a tuning knob. '100' is a reasonable default for up to
-- 1 million vectors. For more vectors, this number should be increased (e.g., lists = N / 1000 where N is the number of rows).

-- Script finished. The database is now ready for the ingestion script.

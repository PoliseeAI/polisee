-- Add vector extension for RAG capabilities
CREATE EXTENSION IF NOT EXISTS vector;

-- Table to store the full, hierarchical structure of the bill
CREATE TABLE bill_nodes (
    id SERIAL PRIMARY KEY,
    bill_id VARCHAR(255) NOT NULL, -- e.g., 'H.R.1_119th'
    parent_id INTEGER REFERENCES bill_nodes(id), -- Self-referencing key for the tree structure
    level VARCHAR(50) NOT NULL, -- e.g., 'TITLE', 'SEC', 'subsection'
    heading TEXT, -- The heading text of the node, e.g., "SEC. 10101. RE-EVALUATION..."
    node_text TEXT, -- The body text of this specific node
    full_path TEXT, -- A human-readable path for context, e.g., "TITLE I > Subtitle A > SEC. 10101"
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table to store the specific, searchable chunks with their vector embeddings
CREATE TABLE bill_chunks (
    id SERIAL PRIMARY KEY,
    node_id INTEGER NOT NULL REFERENCES bill_nodes(id), -- Foreign key to the full node
    bill_id VARCHAR(255) NOT NULL,
    chunk_text TEXT, -- The actual text content that is embedded
    embedding vector(1536), -- Vector from an embedding model. OpenAI's text-embedding-3-small is 1536 dimensions.
    metadata JSONB, -- Store level, path, heading, etc. for quick access
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_bill_nodes_parent_id ON bill_nodes(parent_id);
CREATE INDEX idx_bill_nodes_bill_id ON bill_nodes(bill_id);
CREATE INDEX idx_bill_chunks_node_id ON bill_chunks(node_id);
CREATE INDEX idx_bill_chunks_bill_id ON bill_chunks(bill_id);

-- Create an IVFFlat index for efficient vector similarity search.
-- The lists value should be chosen based on the number of rows.
-- A good starting point is sqrt(number of rows) for up to 1M rows.
-- We'll start with a reasonable default.
CREATE INDEX ON bill_chunks USING ivfflat (embedding vector_l2_ops) WITH (lists = 100);

-- Enable Row Level Security (RLS) for the new tables
ALTER TABLE bill_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_chunks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for bill_nodes
-- For now, we'll allow all authenticated users to read bill data
-- You can make this more restrictive based on your requirements
CREATE POLICY "Anyone can view bill nodes" ON bill_nodes
    FOR SELECT USING (true);

CREATE POLICY "Service role can manage bill nodes" ON bill_nodes
    FOR ALL USING (auth.role() = 'service_role');

-- Create RLS policies for bill_chunks
CREATE POLICY "Anyone can view bill chunks" ON bill_chunks
    FOR SELECT USING (true);

CREATE POLICY "Service role can manage bill chunks" ON bill_chunks
    FOR ALL USING (auth.role() = 'service_role');

-- Create a function to perform semantic search on bill chunks
CREATE OR REPLACE FUNCTION search_bill_chunks(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.8,
    match_count int DEFAULT 10
)
RETURNS TABLE (
    id int,
    node_id int,
    bill_id varchar,
    chunk_text text,
    metadata jsonb,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        bill_chunks.id,
        bill_chunks.node_id,
        bill_chunks.bill_id,
        bill_chunks.chunk_text,
        bill_chunks.metadata,
        1 - (bill_chunks.embedding <-> query_embedding) as similarity
    FROM bill_chunks
    WHERE 1 - (bill_chunks.embedding <-> query_embedding) > match_threshold
    ORDER BY bill_chunks.embedding <-> query_embedding
    LIMIT match_count;
END;
$$;

-- Create a function to get bill hierarchy for a specific node
CREATE OR REPLACE FUNCTION get_bill_hierarchy(node_id_param int)
RETURNS TABLE (
    id int,
    bill_id varchar,
    parent_id int,
    level varchar,
    heading text,
    node_text text,
    full_path text,
    depth int
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE bill_hierarchy AS (
        -- Base case: start with the specified node
        SELECT 
            bn.id,
            bn.bill_id,
            bn.parent_id,
            bn.level,
            bn.heading,
            bn.node_text,
            bn.full_path,
            0 as depth
        FROM bill_nodes bn
        WHERE bn.id = node_id_param
        
        UNION ALL
        
        -- Recursive case: find children
        SELECT 
            bn.id,
            bn.bill_id,
            bn.parent_id,
            bn.level,
            bn.heading,
            bn.node_text,
            bn.full_path,
            bh.depth + 1
        FROM bill_nodes bn
        INNER JOIN bill_hierarchy bh ON bn.parent_id = bh.id
    )
    SELECT * FROM bill_hierarchy
    ORDER BY depth, id;
END;
$$; 
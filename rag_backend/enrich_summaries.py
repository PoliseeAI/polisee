# Script to populate the 'summary_embeddings' table. Retrieves all summaries
# from 'ai_bill_summaries' that don't already have an embedding, and generates
# their embeddings.

import os
import psycopg2
import psycopg2.extras
from openai import OpenAI
from dotenv import load_dotenv

# --- Configuration ---
load_dotenv()

# Get your Supabase connection string from your .env file or directly here
SUPABASE_DB_URL = os.getenv("SUPABASE_DB_URL") 
if not SUPABASE_DB_URL:
    raise ValueError("Please set the SUPABASE_DB_URL environment variable.")

# AI Config
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
EMBEDDING_MODEL = "text-embedding-3-small"

def get_db_connection():
    return psycopg2.connect(SUPABASE_DB_URL)

def generate_embeddings(texts):
    if not texts: return []
    try:
        response = client.embeddings.create(input=texts, model=EMBEDDING_MODEL)
        return [item.embedding for item in response.data]
    except Exception as e:
        print(f"    > ERROR generating embeddings: {e}")
        return []

def process_unsummarized_bills():
    print("Connecting to Supabase DB...")
    conn = get_db_connection()
    
    with conn.cursor() as cur:
        # Fetch summaries that have not yet been embedded
        cur.execute("SELECT id, bill_table_id, what_it_does, key_changes, who_it_affects FROM ai_bill_summaries WHERE is_embedded = FALSE;")
        summaries_to_process = cur.fetchall()

    print(f"Found {len(summaries_to_process)} summaries to process.")

    for summary_id, bill_table_id, what_it_does, key_changes, who_it_affects in summaries_to_process:
        print(f"\n--- Processing Summary ID: {summary_id} ---")
        
        chunks_to_embed = []
        # Structure: (summary_id, bill_table_id, source_column, chunk_text)
        chunks_to_embed.append((summary_id, bill_table_id, 'what_it_does', what_it_does))
        
        for change in key_changes:
            chunks_to_embed.append((summary_id, bill_table_id, 'key_changes', change))
        
        for person in who_it_affects:
            chunks_to_embed.append((summary_id, bill_table_id, 'who_it_affects', person))

        print(f"  > Deconstructed into {len(chunks_to_embed)} granular chunks.")
        
        raw_texts = [chunk[3] for chunk in chunks_to_embed]
        
        print(f"  > Generating {len(raw_texts)} embeddings with OpenAI...")
        embeddings = generate_embeddings(raw_texts)

        if not embeddings or len(embeddings) != len(chunks_to_embed):
            print(f"  > FAILED to generate embeddings for Summary ID {summary_id}. Skipping.")
            continue
            
        # Prepare data for bulk insert
        records_to_insert = [
            (chunk[0], chunk[1], chunk[2], chunk[3], embedding)
            for chunk, embedding in zip(chunks_to_embed, embeddings)
        ]

        try:
            with conn.cursor() as cur:
                # Use execute_values for efficient bulk insertion
                psycopg2.extras.execute_values(
                    cur,
                    "INSERT INTO summary_embeddings (summary_id, bill_table_id, source_column, chunk_text, embedding) VALUES %s",
                    records_to_insert
                )
                # Mark the original summary as processed
                cur.execute("UPDATE ai_bill_summaries SET is_embedded = TRUE WHERE id = %s;", (summary_id,))
                
                conn.commit()
                print(f"  > Successfully inserted {len(records_to_insert)} embeddings and updated summary status.")

        except Exception as e:
            print(f"  > DATABASE ERROR on Summary ID {summary_id}: {e}")
            conn.rollback()

    conn.close()
    print("\nProcessing complete.")

if __name__ == "__main__":
    process_unsummarized_bills()

import os
import json
import psycopg2
from pgvector.psycopg2 import register_vector
from openai import OpenAI
from dotenv import load_dotenv

# --- Configuration ---
load_dotenv() # Load variables from .env file

# DB Config
DB_NAME = os.getenv('DB_NAME', 'bills')
DB_USER = os.getenv('DB_USER', 'postgres')
DB_PASSWORD = os.getenv('DB_PASSWORD', 'postgres')
DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = os.getenv('DB_PORT', '5432')

# AI Config
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
EMBEDDING_MODEL = "text-embedding-3-small"
TAG_GENERATION_MODEL = "gpt-4o-mini"
EMBEDDING_DIM = 1536 # Must match the model's output dimension
CHUNK_SIZE = 400  # Words per chunk
CHUNK_OVERLAP = 50 # Words to overlap between chunks

def get_db_connection():
    """Establishes and returns a connection to the PostgreSQL database."""
    conn = psycopg2.connect(dbname=DB_NAME, user=DB_USER, password=DB_PASSWORD, host=DB_HOST, port=DB_PORT)
    register_vector(conn)
    return conn

def generate_tags(title, summary):
    """Uses an LLM to generate a list of topical tags for a bill."""
    if not summary:
        summary = "No summary available."
    
    prompt = f"""
    Based on the following bill title and summary, generate a JSON array of 5 to 10 relevant topical tags.
    The tags should be broad categories suitable for filtering. Example categories include:
    Healthcare, National Security, Agriculture, Technology, Small Business, Taxation, Environment,
    Education, Immigration, Financial Services, Energy, Transportation, Veterans Affairs, Housing, Labor.
    Return ONLY the JSON array.

    Title: {title}
    Summary: {summary[:2000]}
    """
    
    try:
        response = client.chat.completions.create(
            model=TAG_GENERATION_MODEL,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            temperature=0.2,
        )
        # The response is expected to be a JSON object like {"tags": ["Healthcare", ...]}
        # We extract the list from the "tags" key or a similar key.
        content = json.loads(response.choices[0].message.content)
        # Be flexible with the key name LLM might use
        tags_list = content.get("tags") or content.get("topics") or list(content.values())[0]
        return [str(tag) for tag in tags_list]
    except Exception as e:
        print(f"    > ERROR generating tags: {e}")
        return []

def chunk_text(text):
    """Splits a long text into smaller, overlapping chunks."""
    if not text:
        return []
    words = text.split()
    chunks = []
    for i in range(0, len(words), CHUNK_SIZE - CHUNK_OVERLAP):
        chunk = " ".join(words[i:i + CHUNK_SIZE])
        chunks.append(chunk)
    return chunks

def generate_embeddings(text_chunks):
    """Generates vector embeddings for a list of text chunks."""
    if not text_chunks:
        return []
    try:
        response = client.embeddings.create(input=text_chunks, model=EMBEDDING_MODEL)
        return [item.embedding for item in response.data]
    except Exception as e:
        print(f"    > ERROR generating embeddings: {e}")
        return []

def process_unprocessed_bills():
    """The main offline processing pipeline."""
    conn = get_db_connection()
    with conn.cursor() as cur:
        # Fetch bills that have full_text but haven't been tagged or chunked yet.
        cur.execute("""
            SELECT b.id, b.title, b.full_text, s.text AS summary
            FROM bills b
            LEFT JOIN bill_summaries s ON b.id = s.bill_id
            WHERE b.full_text IS NOT NULL 
              AND b.tags IS NULL
              AND (s.version_code = '00' OR s.version_code IS NULL) -- Get introduced summary
            ORDER BY b.id;
        """)
        bills_to_process = cur.fetchall()

    print(f"Found {len(bills_to_process)} bills to process.")

    for bill_id, title, full_text, summary in bills_to_process:
        print(f"\n--- Processing Bill ID: {bill_id}, Title: {title[:50]}... ---")
        
        try:
            with conn.cursor() as cur:
                # 1. Generate and save tags
                print("  > Generating tags...")
                tags = generate_tags(title, summary)
                if tags:
                    cur.execute("UPDATE bills SET tags = %s WHERE id = %s;", (tags, bill_id))
                    print(f"    > Saved tags: {tags}")
                else:
                    print("    > No tags were generated.")

                # 2. Chunk the text
                print("  > Chunking full text...")
                text_chunks = chunk_text(full_text)
                if not text_chunks:
                    print("    > No text to chunk. Skipping embeddings.")
                    conn.commit()
                    continue
                print(f"    > Created {len(text_chunks)} chunks.")

                # 3. Generate and save embeddings for chunks
                print("  > Generating embeddings...")
                embeddings = generate_embeddings(text_chunks)
                if embeddings and len(embeddings) == len(text_chunks):
                    # Clear old chunks for this bill to handle updates gracefully
                    cur.execute("DELETE FROM bill_chunks WHERE bill_id = %s;", (bill_id,))
                    for chunk, embedding in zip(text_chunks, embeddings):
                        cur.execute(
                            "INSERT INTO bill_chunks (bill_id, chunk_text, embedding) VALUES (%s, %s, %s);",
                            (bill_id, chunk, embedding)
                        )
                    print(f"    > Saved {len(embeddings)} chunk embeddings.")
                else:
                    print("    > Embedding generation failed or returned mismatched count.")

            # Commit the transaction for this bill
            conn.commit()
            print(f"  > Transaction for Bill ID {bill_id} committed.")

        except Exception as e:
            print(f"  > FATAL ERROR on Bill ID {bill_id}: {e}")
            conn.rollback()

    conn.close()
    print("\nProcessing finished.")

if __name__ == "__main__":
    process_unprocessed_bills()

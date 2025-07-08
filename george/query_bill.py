import os
import json
import psycopg2
from openai import OpenAI
from dotenv import load_dotenv

# --- Configuration ---
load_dotenv()
DB_HOST = os.getenv("DB_HOST")
DB_NAME = os.getenv("DB_NAME")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

EMBEDDING_MODEL = "text-embedding-3-small"
LLM_MODEL = "gpt-4-turbo-preview"
TOP_K_CHUNKS = 5 # Number of initial chunks to retrieve

# --- Validate Configuration ---
if not all([DB_HOST, DB_NAME, DB_USER, DB_PASSWORD, OPENAI_API_KEY]):
    raise ValueError("One or more required environment variables are not set in .env")

# --- Initialize OpenAI Client ---
client = OpenAI(api_key=OPENAI_API_KEY)


def connect_to_db():
    """Establishes a connection to the PostgreSQL database."""
    try:
        conn = psycopg2.connect(host=DB_HOST, dbname=DB_NAME, user=DB_USER, password=DB_PASSWORD)
        return conn
    except psycopg2.OperationalError as e:
        print(f"Error: Could not connect to the database. Details: {e}")
        return None

def generate_embedding(text: str):
    """Generates a vector embedding for the given text."""
    try:
        response = client.embeddings.create(input=text, model=EMBEDDING_MODEL)
        return response.data[0].embedding
    except Exception as e:
        print(f"Error generating embedding: {e}")
        return None

def find_relevant_chunks(embedding, db_conn):
    """Queries for the most relevant individual chunks."""
    with db_conn.cursor() as cur:
        query_sql = """
            SELECT section_id, content
            FROM bill_chunks
            ORDER BY embedding <-> %s
            LIMIT %s;
        """
        cur.execute(query_sql, (str(embedding), TOP_K_CHUNKS))
        return cur.fetchall()

def retrieve_full_context_for_sections(section_ids, db_conn):
    """Retrieves all chunks associated with a set of parent section_ids."""
    unique_section_ids = list(set(section_ids))
    with db_conn.cursor() as cur:
        query_sql = """
            SELECT DISTINCT ON (content) section_id, chunk_type, content
            FROM bill_chunks
            WHERE section_id IN %s
            ORDER BY content, section_id, chunk_type;
        """
        cur.execute(query_sql, (tuple(unique_section_ids),))
        results = cur.fetchall()
        
    # Group results by section_id to maintain structure
    context_by_section = {section_id: [] for section_id in unique_section_ids}
    for row in results:
        context_by_section[row[0]].append(f"--- Chunk Type: {row[1]} ---\n{row[2]}")
        
    # Combine the grouped contexts into a single string
    full_context_str = ""
    for section_id in unique_section_ids:
        full_context_str += f"\n\n=== CONTEXT FOR SECTION {section_id} ===\n"
        full_context_str += "\n\n".join(context_by_section[section_id])
        
    return full_context_str

def generate_answer(query, context_str, client):
    """Generates a final answer using the LLM."""
    system_prompt = """
You are an expert legislative analyst. Your task is to answer the user's question based ONLY on the provided context, which contains chunks of information related to one or more sections of a bill.
- Synthesize information across the different chunks (e.g., 'bill_text', 'original_law', 'summary') to provide a complete answer.
- When answering, clearly explain what the bill *does* to existing law. If the context shows a change, describe the "before" and "after" if possible.
- If the context provides a specific section number, cite it in your answer.
- Do not make up information or use any knowledge outside of the provided context. If the answer is not in the context, state that explicitly.
"""
    user_prompt = f"""
--- CONTEXT ---
{context_str}
--- END CONTEXT ---

Based on the context provided, please answer the following question:
User Question: {query}
"""
    try:
        response = client.chat.completions.create(
            model=LLM_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.0
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"Error generating answer: {e}"

def main():
    db_conn = connect_to_db()
    if not db_conn:
        return

    print("Connected to the database. Ask questions about the bill (type 'exit' to quit).")

    while True:
        user_query = input("\nYour Question: ")
        if user_query.lower() in ['exit', 'quit']:
            break
        
        print("   Generating query embedding...")
        query_embedding = generate_embedding(user_query)
        if not query_embedding:
            continue

        print(f"   Searching for the top {TOP_K_CHUNKS} relevant chunks...")
        initial_chunks = find_relevant_chunks(query_embedding, db_conn)
        
        if not initial_chunks:
            print("Could not find any relevant sections in the bill for your query.")
            continue
            
        # Get the section_ids from the top chunks
        relevant_section_ids = [chunk[0] for chunk in initial_chunks]
        
        print(f"   Found relevant sections: {list(set(relevant_section_ids))}. Retrieving full context...")
        full_context = retrieve_full_context_for_sections(relevant_section_ids, db_conn)
        
        print("   Generating answer...")
        answer = generate_answer(user_query, full_context, client)
        
        print("\n--- Answer ---\n")
        print(answer)
        
    db_conn.close()
    print("Database connection closed. Goodbye!")

if __name__ == "__main__":
    main()

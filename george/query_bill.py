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
LLM_MODEL = "gpt-4-turbo-preview" # Or any other powerful model like "gpt-4"
TOP_K = 5 # Number of top results to retrieve

# --- Validate Configuration ---
if not all([DB_HOST, DB_NAME, DB_USER, DB_PASSWORD, OPENAI_API_KEY]):
    raise ValueError("One or more required environment variables are not set in .env")

# --- Initialize OpenAI Client ---
client = OpenAI(api_key=OPENAI_API_KEY)


def connect_to_db():
    """Establishes and returns a connection to the PostgreSQL database."""
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD
        )
        return conn
    except psycopg2.OperationalError as e:
        print(f"Error: Could not connect to the database. Please check your .env settings.")
        print(f"Details: {e}")
        return None

def generate_embedding(text: str):
    """Generates a vector embedding for the given text."""
    try:
        response = client.embeddings.create(
            input=text,
            model=EMBEDDING_MODEL
        )
        return response.data[0].embedding
    except Exception as e:
        print(f"Error generating embedding: {e}")
        return None

def query_database(embedding, db_conn):
    """Queries the database to find the most relevant sections."""
    with db_conn.cursor() as cur:
        # The <-> operator performs L2 distance search with pgvector
        query_sql = """
            SELECT section_number, section_header, full_context_text, embedding <-> %s AS distance
            FROM bill_sections
            ORDER BY distance
            LIMIT %s;
        """
        cur.execute(query_sql, (str(embedding), TOP_K))
        results = cur.fetchall()
    return results

def generate_answer(query, context_str, client):
    """Generates a final answer using the LLM based on the retrieved context."""
    system_prompt = """
You are an expert legislative analyst. Your task is to answer the user's question based ONLY on the provided context from the bill.
- When answering, clearly explain what the bill *does* to existing law. If the context shows a change, describe the "before" and "after" if possible.
- If the context provides a specific section number, cite it in your answer (e.g., "According to Section 110101...").
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

        print("   Searching for relevant sections...")
        retrieved_results = query_database(query_embedding, db_conn)
        
        if not retrieved_results:
            print("Could not find any relevant sections in the bill for your query.")
            continue
            
        # Combine the context from all retrieved chunks
        context_str = "\n\n---\n\n".join([result[2] for result in retrieved_results])
        
        print("   Generating answer...")
        answer = generate_answer(user_query, context_str, client)
        
        print("\n--- Answer ---\n")
        print(answer)
        
    db_conn.close()
    print("Database connection closed. Goodbye!")


if __name__ == "__main__":
    main()

import os
import sys
import json
import psycopg2
import psycopg2.extras
from pgvector.psycopg2 import register_vector
from openai import OpenAI
from sentence_transformers import CrossEncoder
from dotenv import load_dotenv

# --- Configuration ---
load_dotenv()

# DB Config: Uses a single connection string from your .env file
# Example: postgresql://postgres:your-postgres-password@db.project-ref.supabase.co:5432/postgres
SUPABASE_DB_URL = os.getenv("SUPABASE_DB_URL")
if not SUPABASE_DB_URL:
    raise ValueError("CRITICAL: SUPABASE_DB_URL environment variable not set.")

# --- AI Model Configuration ---
# 1. GENERATOR & EMBEDDER (OpenAI)
#    - Uses your pre-computed 1536-dimension vectors.
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
SYNTHESIS_MODEL = "gpt-4o-mini"
EMBEDDING_MODEL = "text-embedding-3-small"

# 2. RE-RANKER (Local Cross-Encoder)
#    - This model is loaded into memory once when the script starts.
print("Loading Re-Ranker model (cross-encoder)...")
cross_encoder = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')
print("Models loaded and ready.")


def get_db_connection():
    """Establishes and returns a connection to the Supabase database."""
    conn = psycopg2.connect(SUPABASE_DB_URL)
    register_vector(conn)
    return conn

def decompose_persona_to_questions(persona: str) -> list[str]:
    """Uses LLM to get searchable sub-questions from a user persona."""
    prompt = f"A user has described themselves with the following persona. Decompose this persona into 3 to 5 specific, concrete questions they might ask about US legislation. Frame the questions from the user's perspective. Persona: '{persona}'. Return a JSON object with a single key \"questions\" that contains an array of the question strings."
    
    try:
        response = client.chat.completions.create(
            model=SYNTHESIS_MODEL,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            temperature=0.2,
        )
        content = json.loads(response.choices[0].message.content or '{}')
        return content.get("questions", [])
    except Exception as e:
        print(f"Error decomposing persona: {e}", file=sys.stderr)
        return []

def retrieve_initial_candidates(sub_questions: list[str], limit_per_question=10) -> list[dict]:
    """Performs a vector search for each sub-question and aggregates the results."""
    all_candidates = {} # Use a dict to automatically handle duplicates
    conn = get_db_connection()
    
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        for question in sub_questions:
            embedding = client.embeddings.create(input=[question], model=EMBEDDING_MODEL).data[0].embedding

            cur.execute(
                "SELECT * FROM match_summary_chunks(%s::vector, %s, %s);",
                (embedding, 0.3, limit_per_question) # Using the DB function
            )
            
            for row in cur.fetchall():
                if row['id'] not in all_candidates:
                    all_candidates[row['id']] = dict(row)

    conn.close()
    print(f"   > Retrieved {len(all_candidates)} unique candidate chunks.")
    return list(all_candidates.values())

def rerank_with_cross_encoder(persona: str, candidates: list[dict]) -> list[dict]:
    """Re-ranks candidate chunks using a more powerful local CrossEncoder model."""
    if not candidates:
        return []
    
    pairs = [[persona, candidate['chunk_text']] for candidate in candidates]
    
    print(f"   > Re-ranking {len(pairs)} candidates with CrossEncoder for precision...")
    scores = cross_encoder.predict(pairs, show_progress_bar=True)
    
    for i in range(len(candidates)):
        candidates[i]['score'] = scores[i]
        
    return sorted(candidates, key=lambda x: x['score'], reverse=True)

def generate_final_summary(persona: str, final_context: list[dict]) -> list[dict]:
    """
    Uses LLM to synthesize results into a structured JSON list.
    Each item in the list contains a summary point and the corresponding bill ID.
    """
    if not final_context:
        return []

    context_str = ""
    bill_ids = list(set([c['bill_table_id'] for c in final_context]))

    conn = get_db_connection()
    with conn.cursor() as cur:
        cur.execute("SELECT id, title, number, type FROM bills WHERE id = ANY(%s);", (bill_ids,))
        bills = cur.fetchall()
        bill_map = {b[0]: {'title': b[1], 'number': b[2], 'type': b[3]} for b in bills}
    conn.close()
    
    for i, chunk in enumerate(final_context):
        bill = bill_map.get(chunk['bill_table_id'])
        # --- CHANGE 1: Add bill_table_id to the context string ---
        citation = f"{bill['type']} {bill['number']}" if bill else "Unknown Bill"
        context_str += f"Context {i + 1} (from bill {citation}, internal_id: {chunk['bill_table_id']}):\n\"{chunk['chunk_text']}\"\n\n"

    # --- CHANGE 2: Completely new prompt asking for JSON output ---
    prompt = f"""
    You are a helpful and neutral policy analyst.
    A user, whose persona is '{persona}', asked what they should know about recent legislation.
    Based *only* on the following context, generate a JSON array of objects.
    Each object should represent a single, distinct point of interest for the user and have two keys:
    1. "summary_point": A string containing a concise summary of the point. This string MUST include the human-readable bill number (e.g., "HR 4303").
    2. "bill_id": An integer representing the internal database ID of the bill, extracted from the context's 'internal_id'.

    Example output format:
    [
      {{
        "summary_point": "The Social Security Fairness Act (bill H.R. 82) aims to repeal provisions that reduce benefits for government retirees.",
        "bill_id": 3
      }},
      {{
        "summary_point": "A new bill, S. 2172, proposes an increase in funding for veteran mental health services.",
        "bill_id": 250
      }}
    ]

    Do not add any information that is not present in the provided context.
    
    --- CONTEXT ---
    {context_str}
    --- END CONTEXT ---

    JSON Response:
    """

    response = client.chat.completions.create(
        model=SYNTHESIS_MODEL,
        messages=[{"role": "user", "content": prompt}],
        # We now require the model to output a JSON object
        response_format={"type": "json_object"}, 
        temperature=0.5,
    )

    # --- CHANGE 3: Parse the JSON string into a Python list ---
    try:
        # The model is often instructed to return a root key, e.g. {"points": [...]}.
        # We'll try to find the list within the returned object.
        result_json = json.loads(response.choices[0].message.content or '[]')
        if isinstance(result_json, dict):
            # Find the first value in the dict that is a list
            for key, value in result_json.items():
                if isinstance(value, list):
                    return value
        elif isinstance(result_json, list):
             return result_json
        return [] # Return empty list if format is unexpected
    except json.JSONDecodeError:
        print("Error: LLM did not return valid JSON.")
        return []


def answer_persona_query(persona: str) -> str:
    """Orchestrates the new, high-fidelity query process and returns the final string."""
    print(f"\n--- Answering query for persona: '{persona}' ---")
    
    print("1. Decomposing persona into specific questions...")
    sub_questions = decompose_persona_to_questions(persona)
    if not sub_questions:
        return "Could not understand the persona to generate questions."
    print(f"   > Generated questions: {json.dumps(sub_questions, indent=2)}")

    print("\n2. Retrieving initial candidates via Vector Search...")
    candidates = retrieve_initial_candidates(sub_questions)

    print("\n3. Re-ranking candidates for precision...")
    reranked_results = rerank_with_cross_encoder(persona, candidates)

    final_context = reranked_results[:7]
    print(f"   > Selected top {len(final_context)} chunks for synthesis.")

    print("\n4. Synthesizing final answer...")
    final_answer = generate_final_summary(persona, final_context)
    
    return final_answer


if __name__ == "__main__":
    if len(sys.argv) > 1:
        user_persona_query = " ".join(sys.argv[1:])
        # The function now returns a list of dictionaries
        structured_answer = answer_persona_query(user_persona_query)
        
        print("\n" + "="*20 + " FINAL STRUCTURED ANSWER " + "="*20 + "\n")
        # Use json.dumps for pretty-printing the structured output
        print(json.dumps(structured_answer, indent=2))
        print("\n" + "="*61 + "\n")
    else:
        print("Usage: python query_engine.py \"<your persona or question>\"")
        print("\nExample:")
        print("python query_engine.py \"I'm a farmer in the Midwest concerned about water rights and international trade.\"")

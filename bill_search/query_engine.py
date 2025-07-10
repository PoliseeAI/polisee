import os
import json
import psycopg2
import logging
from typing import List, Dict, Any, Tuple, Set

from openai import OpenAI
from dotenv import load_dotenv

# --- Configuration ---
# Load environment variables from a .env file for local development
load_dotenv()

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# --- Constants ---
LLM_MODEL = "gpt-4o-mini"
EMBEDDING_MODEL = "text-embedding-3-small"
MAX_FINAL_RESULTS = 5 # As requested, cap the final output to 5 bills.
CANDIDATE_BILL_COUNT_PER_FACET = 5 # How many bills to fetch for each individual facet.
TOP_CANDIDATE_BILLS_FOR_SYNTHESIS = 7 # How many top candidates to send to the final LLM call.

# --- Initialize Clients ---
try:
    OPENAI_API_KEY = os.environ["OPENAI_API_KEY"]
    SUPABASE_DB_URL = os.environ["SUPABASE_DB_URL"]
    openai_client = OpenAI(api_key=OPENAI_API_KEY)
except KeyError as e:
    logging.error(f"FATAL: Missing environment variable: {e}")
    raise SystemExit(f"Error: Missing environment variable: {e}. Please set it before running.")

# --- Helper Functions ---

def _get_db_connection():
    """Establishes a connection to the Supabase PostgreSQL database."""
    try:
        conn = psycopg2.connect(SUPABASE_DB_URL)
        return conn
    except psycopg2.OperationalError as e:
        logging.error(f"Database connection failed: {e}")
        raise

def _extract_persona_facets(persona: str) -> List[str]:
    """
    Uses an LLM to deconstruct a user persona into a list of searchable facets.
    Returns an empty list if the persona is too vague or nonsensical.
    """
    prompt = f"""
    Analyze the following user persona. Extract a list of distinct, concise attributes such as demographics, occupations, interests, locations, and financial situations.
    These attributes should be factual and suitable for a semantic search.

    - If the persona is detailed, extract multiple attributes.
    - If the persona is vague, nonsensical, or provides no useful information (e.g., "I'm a person"), return an empty list.

    Persona: "I'm a 45-year-old software engineer living in California, married with two kids. I served in the army for 8 years and am very concerned about climate change."
    Result: {{"result": ["software engineer", "California resident", "parent", "military veteran", "interest in climate change"]}}

    Persona: "Tell me what's relevant to me."
    Result: []

    Now, analyze the following persona and return the result as a JSON array of strings under the key "result"
    Return ONLY the JSON and nothing else.

    Persona: "{persona}"
    """
    try:
        print(prompt)
        response = openai_client.chat.completions.create(
            model=LLM_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.0,
            response_format={"type": "json_object"},
        )
        # The prompt asks for a JSON array, but response_format wraps it in a dict.
        # We need to gracefully extract the list, assuming it might be under a key.
        content = response.choices[0].message.content
        print(content)
        data = json.loads(content)
        # Find the list within the JSON object
        for value in data.values():
            if isinstance(value, list):
                return [item for item in value if isinstance(item, str)]
        return [] # Return empty if no list is found
    except (json.JSONDecodeError, IndexError, KeyError) as e:
        logging.error(f"Failed to extract facets from LLM response: {e}. Response: {response.choices[0].message.content}")
        return []

def _embed_texts(texts: List[str]) -> List[List[float]]:
    """Generates embeddings for a list of texts using OpenAI's API."""
    response = openai_client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=texts
    )
    return [item.embedding for item in response.data]

def _search_for_facet(facet_embedding: List[float], conn) -> List[Tuple[int, float, str]]:
    """
    Performs a vector search in the database for a single facet's embedding.
    Returns a list of (bill_table_id, similarity_score, chunk_text).
    """
    query = """
    SELECT
        bill_table_id,
        1 - (embedding <=> %s) AS similarity,
        chunk_text
    FROM
        public.summary_embeddings
    ORDER BY
        similarity DESC
    LIMIT %s;
    """
    # psycopg2 requires the vector to be a string, not a list
    embedding_str = str(facet_embedding)
    results = []
    with conn.cursor() as cur:
        cur.execute(query, (embedding_str, CANDIDATE_BILL_COUNT_PER_FACET))
        for row in cur.fetchall():
            results.append((row[0], row[1], row[2])) # bill_id, similarity, chunk_text
    return results

def _get_bill_details(bill_ids: Set[int], conn) -> Dict[int, Dict[str, Any]]:
    """Fetches bill title and summary for a set of candidate bill IDs."""
    if not bill_ids:
        return {}

    query = """
    SELECT
        b.id,
        b.bill_id as bill_short_name,
        b.title,
        s.what_it_does
    FROM
        public.bills b
    JOIN
        public.ai_bill_summaries s ON b.id = s.bill_table_id
    WHERE
        b.id IN %s;
    """
    bill_details = {}
    with conn.cursor() as cur:
        cur.execute(query, (tuple(bill_ids),))
        for row in cur.fetchall():
            bill_details[row[0]] = {
                "bill_short_name": row[1],
                "title": row[2],
                "what_it_does": row[3]
            }
    return bill_details

def _synthesize_final_results(persona: str, candidates: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Uses an LLM to generate the final, user-facing summary and relevance score for each candidate bill.
    This is done in a single batch call.
    """
    if not candidates:
        return []

    # Construct a detailed prompt with all candidate information
    candidate_prompts = []
    for i, cand in enumerate(candidates):
        candidate_prompts.append(
            f"""
            Candidate {i+1}:
            - Bill ID: {cand['bill_id']}
            - Bill Title: {cand['details']['title']}
            - Bill Summary: {cand['details']['what_it_does']}
            - Matched Persona Facets: {list(cand['matched_facets'])}
            - Most Relevant Snippet Found: "{cand['top_chunk_text']}"
            """
        )

    system_prompt = """
    You are a helpful and concise US policy analyst. Your task is to analyze a user's persona and a list of potentially relevant congressional bills.
    For each bill, you will generate a single, compelling sentence explaining its relevance to the user and a relevance score.
    The final output MUST be a JSON array of objects. Each object must have two keys: "summary_point" (string) and "relevance_score" (integer 0-100).
    Base the relevance score on how direct and significant the impact on the user's specific persona is. A bill naming a post office for a veteran is less impactful than one changing their healthcare benefits.
    """
    user_prompt = f"""
    User Persona: "{persona}"

    Based on this persona, I have found the following candidate bills. Please analyze each one and generate the required JSON output.
    Return ONLY the JSON array, with one object for each candidate bill. Do not include the bill_id in your output.

    Candidates:
    {"".join(candidate_prompts)}
    """

    try:
        response = openai_client.chat.completions.create(
            model=LLM_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.2,
            response_format={"type": "json_object"}
        )
        content = response.choices[0].message.content
        # As before, extract the list from the returned JSON object
        data = json.loads(content)
        llm_results = []
        for value in data.values():
            if isinstance(value, list):
                llm_results = value
                break

        # Combine LLM results with our internal bill_id
        final_results = []
        for i, res in enumerate(llm_results):
            if i < len(candidates):
                # Ensure the LLM result is well-formed before adding
                if 'summary_point' in res and 'relevance_score' in res:
                    final_results.append({
                        "bill_id": candidates[i]['bill_id'],
                        "summary_point": res['summary_point'],
                        "relevance_score": res['relevance_score']
                    })
        return final_results
    except (json.JSONDecodeError, IndexError, KeyError) as e:
        logging.error(f"LLM synthesis failed or returned malformed data: {e}")
        return []


# --- Main Orchestration Function ---

def answer_persona_query(persona: str) -> List[Dict[str, Any]]:
    """
    The main function to find relevant bills for a given persona.

    This function orchestrates a multi-step process:
    1. Deconstructs the persona into searchable "facets" using an LLM.
    2. For each facet, performs a vector search to find relevant bill text chunks.
    3. Aggregates and ranks the candidate bills based on similarity and number of matching facets.
    4. Fetches details for the top-ranked bills.
    5. Uses an LLM in a single batch call to synthesize a final, user-friendly summary and relevance score.
    6. Returns a list of bills, sorted by relevance.
    """
    # 1. Extract facets from persona
    logging.info(f"Step 1: Extracting facets for persona...")
    facets = _extract_persona_facets(persona)
    if not facets:
        logging.warning("No usable facets extracted from persona. Returning empty list.")
        return []
    logging.info(f"Found facets: {facets}")

    # 2. Embed all facets and perform parallel searches
    conn = _get_db_connection()
    try:
        facet_embeddings = _embed_texts(facets)
        all_search_results = {} # {bill_id: {'max_similarity': float, 'facets': set(), 'chunks': list}}

        logging.info("Step 2: Performing vector search for each facet...")
        for i, facet in enumerate(facets):
            facet_embedding = facet_embeddings[i]
            search_results = _search_for_facet(facet_embedding, conn)

            # 3. Aggregate results
            for bill_id, similarity, chunk_text in search_results:
                if bill_id not in all_search_results:
                    all_search_results[bill_id] = {
                        "max_similarity": 0.0,
                        "matched_facets": set(),
                        "top_chunk_text": ""
                    }

                # Update max similarity and top chunk text
                if similarity > all_search_results[bill_id]["max_similarity"]:
                    all_search_results[bill_id]["max_similarity"] = similarity
                    all_search_results[bill_id]["top_chunk_text"] = chunk_text
                
                all_search_results[bill_id]["matched_facets"].add(facet)

        if not all_search_results:
            logging.info("No bills found matching any facets.")
            return []

        # 4. Rank candidates
        # Score is based on max similarity plus a bonus for each matching facet
        ranked_candidates = sorted(
            all_search_results.items(),
            key=lambda item: item[1]['max_similarity'] + (len(item[1]['matched_facets']) * 0.1),
            reverse=True
        )
        
        # Prepare top candidates for final synthesis
        top_candidate_ids = {item[0] for item in ranked_candidates[:TOP_CANDIDATE_BILLS_FOR_SYNTHESIS]}
        logging.info(f"Step 3 & 4: Aggregated and ranked {len(top_candidate_ids)} candidate bills.")

        # 5. Fetch details for top candidates
        bill_details = _get_bill_details(top_candidate_ids, conn)
        
        candidates_for_synthesis = []
        for bill_id, data in ranked_candidates[:TOP_CANDIDATE_BILLS_FOR_SYNTHESIS]:
            if bill_id in bill_details:
                candidates_for_synthesis.append({
                    "bill_id": bill_id,
                    "details": bill_details[bill_id],
                    **data
                })

        # 6. Final LLM synthesis
        logging.info("Step 5: Synthesizing final results with LLM...")
        final_results = _synthesize_final_results(persona, candidates_for_synthesis)

        # 7. Sort and truncate final results
        final_results.sort(key=lambda x: x['relevance_score'], reverse=True)
        
        logging.info(f"Successfully generated {len(final_results)} results. Returning top {MAX_FINAL_RESULTS}.")
        return final_results[:MAX_FINAL_RESULTS]

    finally:
        if conn:
            conn.close()

# Example usage for local testing
if __name__ == '__main__':
    test_persona = "I'm a disabled military veteran who runs a small software business in rural Washington. I'm also a parent and concerned about government spending."
    print(f"--- Searching for persona: ---\n{test_persona}\n")
    results = answer_persona_query(test_persona)
    print("--- Results: ---")
    print(json.dumps(results, indent=2))

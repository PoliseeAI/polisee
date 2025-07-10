# Test script to validate that ingest.py ingested the data correctly

# query.py
import os
import sys
import logging
import re
from typing import List, Tuple

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain.schema import Document
from langchain.prompts import ChatPromptTemplate

import config

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def get_db_session() -> Session:
    """Creates and returns a new SQLAlchemy database session."""
    engine = create_engine(config.DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return SessionLocal()

def vector_search(session: Session, query: str, top_k: int = 5) -> List[Tuple[str, str, float]]:
    """
    Performs vector similarity search to find the most relevant chunks.
    Returns a list of (chunk_text, file_name, distance) tuples.
    """
    # Create embedding for the query
    embeddings = OpenAIEmbeddings(model=config.EMBEDDING_MODEL)
    query_embedding = embeddings.embed_query(query)
    
    # Convert embedding to string format for PostgreSQL
    embedding_str = str(query_embedding)
    
    # Perform vector similarity search using pgvector
    # Use a raw SQL string to avoid SQLAlchemy parameter substitution issues
    sql_query = f"""
        SELECT 
            c.chunk_text,
            d.file_name,
            c.embedding <-> '{embedding_str}'::vector as distance
        FROM chunks c
        JOIN documents d ON c.document_id = d.id
        ORDER BY c.embedding <-> '{embedding_str}'::vector
        LIMIT {top_k}
    """
    
    results = session.execute(text(sql_query)).fetchall()
    
    return [(row[0], row[1], row[2]) for row in results]

def renumber_citations(answer: str, source_mapping: dict) -> Tuple[str, dict]:
    """
    Renumbers citations in the answer to start from 1 and returns updated answer and mapping.
    Returns (updated_answer, cited_sources) where cited_sources maps new numbers to filenames.
    """
    # Extract cited numbers from the answer
    cited_numbers = set()
    for match in re.findall(r'\[(\d+(?:,\s*\d+)*)\]', answer):
        for num in match.split(','):
            cited_numbers.add(int(num.strip()))
    
    # Create reverse mapping: old number -> filename
    num_to_file = {num: file for file, num in source_mapping.items()}
    
    # Create new numbering starting from 1
    old_to_new = {}
    cited_sources = {}
    new_num = 1
    
    for old_num in sorted(cited_numbers):
        if old_num in num_to_file:
            old_to_new[old_num] = new_num
            cited_sources[new_num] = num_to_file[old_num]
            new_num += 1
    
    # Update the answer with new numbering
    updated_answer = answer
    # Process in reverse order to avoid conflicts (e.g., [10] before [1])
    for old_num in sorted(cited_numbers, reverse=True):
        if old_num in old_to_new:
            # Use word boundaries to avoid replacing numbers inside other numbers
            updated_answer = re.sub(
                rf'\[{old_num}(?=\]|,)',
                f'[{old_to_new[old_num]}',
                updated_answer
            )
    
    return updated_answer, cited_sources

def generate_answer(query: str, context_chunks: List[Tuple[str, str, float]]) -> Tuple[str, dict]:
    """
    Uses an LLM to generate an answer based on the query and retrieved context.
    Returns a tuple of (answer, source_mapping).
    """
    # Initialize the LLM
    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.7)
    
    # Prepare the context from retrieved chunks and create source mapping
    context_parts = []
    source_mapping = {}  # Maps file names to their citation numbers
    next_source_num = 1
    
    for i, (chunk_text, file_name, distance) in enumerate(context_chunks):
        # Assign a consistent number to each unique source
        if file_name not in source_mapping:
            source_mapping[file_name] = next_source_num
            next_source_num += 1
        
        source_num = source_mapping[file_name]
        context_parts.append(f"[Source {source_num}: {file_name}]\n{chunk_text}\n")
    
    context = "\n---\n".join(context_parts)
    
    # Create the prompt with strict citation requirements
    prompt_template = ChatPromptTemplate.from_messages([
        ("system", """You are a helpful assistant that answers questions about housing policy based on the provided context.

CRITICAL CITATION RULES:
1. EVERY factual statement MUST include a citation in the format [1], [2], etc.
2. Use the exact source number from the context (e.g., if information comes from Source 3, cite it as [3])
3. Multiple citations are allowed for a single statement, e.g., [1,3]
4. Do not make any claims without a citation
5. If you cannot answer with proper citations, say so

Your task is to:
- Answer based ONLY on the provided context
- Include a citation for EVERY fact, statistic, or claim
- Be specific and accurate
- Keep your answer concise but informative"""),
        ("user", """Context from housing policy documents:

{context}

Question: {query}

Remember: Every factual statement must have a citation [X]. Provide a clear, well-structured answer.""")
    ])
    
    # Generate the answer
    messages = prompt_template.format_messages(context=context, query=query)
    response = llm.invoke(messages)
    
    return str(response.content), source_mapping

def interactive_query():
    """
    Main interactive loop for querying the database.
    """
    print("\n=== Housing Policy Query System ===")
    print("Type 'quit' or 'exit' to stop")
    print("Type 'help' for sample questions\n")
    
    session = get_db_session()
    
    try:
        while True:
            # Get user input
            query = input("\nYour question: ").strip()
            
            # Check for exit commands
            if query.lower() in ['quit', 'exit', 'q']:
                print("Goodbye!")
                break
            
            # Show help
            if query.lower() == 'help':
                print("\nSample questions you can ask:")
                print("- What are the main causes of housing affordability issues?")
                print("- How does zoning impact housing supply?")
                print("- What tenant protection policies are being discussed?")
                print("- What is inclusionary zoning and how does it work?")
                print("- What percentage of renters are cost-burdened?")
                continue
            
            # Skip empty queries
            if not query:
                continue
            
            print("\nSearching for relevant information...")
            
            try:
                # Perform vector search
                results = vector_search(session, query, top_k=5)
                
                if not results:
                    print("No relevant information found in the database.")
                    continue
                
                print(f"Found {len(results)} relevant chunks. Generating answer...")
                
                # Generate answer
                answer, source_mapping = generate_answer(query, results)
                
                # Renumber citations to start from 1
                updated_answer, cited_sources = renumber_citations(answer, source_mapping)
                
                print("\n" + "="*60)
                print("ANSWER:")
                print("="*60)
                print(updated_answer)
                print("="*60)
                
                # Show cited references
                if cited_sources:
                    print("\nReferences:")
                    for num in sorted(cited_sources.keys()):
                        print(f"[{num}] {cited_sources[num]}")
                
            except Exception as e:
                logging.error(f"Error processing query: {e}")
                print(f"\nError: Unable to process your query. {str(e)}")
    
    finally:
        session.close()

def batch_query(questions_file: str):
    """
    Process a batch of questions from a file.
    """
    if not os.path.exists(questions_file):
        print(f"Error: File '{questions_file}' not found.")
        return
    
    with open(questions_file, 'r') as f:
        questions = [line.strip() for line in f if line.strip() and not line.startswith('#')]
    
    if not questions:
        print("No questions found in the file.")
        return
    
    print(f"\nProcessing {len(questions)} questions from '{questions_file}'...")
    session = get_db_session()
    
    try:
        for i, query in enumerate(questions, 1):
            print(f"\n{'='*60}")
            print(f"Question {i}/{len(questions)}: {query}")
            print('='*60)
            
            try:
                # Perform vector search
                results = vector_search(session, query, top_k=5)
                
                if not results:
                    print("No relevant information found.")
                    continue
                
                # Generate answer
                answer, source_mapping = generate_answer(query, results)
                
                # Renumber citations to start from 1
                updated_answer, cited_sources = renumber_citations(answer, source_mapping)
                
                print("\nAnswer:")
                print(updated_answer)
                
                # Show cited references
                if cited_sources:
                    print("\nReferences:")
                    for num in sorted(cited_sources.keys()):
                        print(f"[{num}] {cited_sources[num]}")
                
            except Exception as e:
                logging.error(f"Error processing question: {e}")
                print(f"Error: {str(e)}")
    
    finally:
        session.close()

if __name__ == "__main__":
    if len(sys.argv) > 1:
        # Batch mode - process questions from a file
        batch_query(sys.argv[1])
    else:
        # Interactive mode
        interactive_query() 

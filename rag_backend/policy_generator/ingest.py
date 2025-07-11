# ingest.py
import os
import logging
from typing import List, Iterator, Set, Optional
import time

# Import SQLAlchemy components for database interaction
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session

# Import LangChain components for document loading, splitting, and embedding
from langchain_community.document_loaders import PyMuPDFLoader, TextLoader, UnstructuredMarkdownLoader
from langchain_community.vectorstores.pgvector import PGVector
from langchain_core.documents import Document
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings

# Import our application's configuration
import config

# --- Logging Setup ---
# This sets up a simple way to print informative messages to the console.
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def get_db_session() -> Session:
    """
    Creates and returns a database session for querying existing documents.
    """
    engine = create_engine(config.DATABASE_URL)
    SessionLocal = sessionmaker(bind=engine)
    return SessionLocal()

def get_existing_documents(session: Session) -> Set[str]:
    """
    Queries the database to get a set of source filenames that have already been processed.
    Returns a set of filenames (not full paths) that exist in the vector store.
    """
    try:
        # Query the langchain_pg_embedding table for unique source values
        # The metadata is stored as JSONB in the 'cmetadata' column
        query = text("""
            SELECT DISTINCT cmetadata->>'source' as source
            FROM langchain_pg_embedding
            WHERE cmetadata->>'source' IS NOT NULL
            AND collection_id = (
                SELECT uuid FROM langchain_pg_collection 
                WHERE name = :collection_name
            )
        """)
        
        result = session.execute(query, {"collection_name": config.COLLECTION_NAME})
        
        # Extract just the filenames from the full paths
        existing_files = set()
        for row in result:
            if row.source:
                # Get just the filename from the full path
                filename = os.path.basename(row.source)
                existing_files.add(filename)
        
        logging.info(f"Found {len(existing_files)} documents already in the database")
        return existing_files
        
    except Exception as e:
        logging.warning(f"Could not query existing documents (this is normal on first run): {e}")
        return set()

def clean_text(text: str) -> str:
    """
    Remove null bytes and other problematic characters from text.
    PostgreSQL doesn't allow null bytes in string literals.
    """
    if text is None:
        return ""
    # Remove null bytes
    cleaned = text.replace('\x00', '')
    # Also remove other control characters that might cause issues
    # Keep newlines, tabs, and other common whitespace
    cleaned = ''.join(char for char in cleaned if ord(char) >= 32 or char in '\n\r\t')
    return cleaned

def clean_document(doc: Document) -> Document:
    """
    Clean a document's content and metadata to remove null bytes.
    """
    # Clean the page content
    doc.page_content = clean_text(doc.page_content)
    
    # Clean metadata values (they could also contain null bytes)
    if doc.metadata:
        cleaned_metadata = {}
        for key, value in doc.metadata.items():
            if isinstance(value, str):
                cleaned_metadata[key] = clean_text(value)
            else:
                cleaned_metadata[key] = value
        doc.metadata = cleaned_metadata
    
    return doc

def load_documents_from_directory(directory: str, skip_files: Optional[Set[str]] = None) -> Iterator[Document]:
    """
    Loads all supported documents (.txt, .pdf, .md) from a directory and yields them one by one.
    Skips files that are in the skip_files set.
    """
    if skip_files is None:
        skip_files = set()
    
    logging.info(f"Scanning for documents in '{directory}'...")
    new_files_found = 0
    skipped_existing = 0
    
    for filename in os.listdir(directory):
        filepath = os.path.join(directory, filename)
        
        # Skip if this file already exists in the database
        if filename in skip_files:
            logging.info(f"Skipping existing file: {filename}")
            skipped_existing += 1
            continue
        
        # Determine the correct loader based on file extension
        if filepath.endswith(".pdf"):
            loader = PyMuPDFLoader(filepath)
        elif filepath.endswith(".txt"):
            loader = TextLoader(filepath)
        elif filepath.endswith(".md"):
            loader = UnstructuredMarkdownLoader(filepath)
        else:
            # Skip unsupported files
            logging.info(f"Skipping unsupported file: {filename}")
            continue
        
        try:
            logging.info(f"Loading new document: {filename}")
            new_files_found += 1
            # The loader returns a list of documents, yield each one
            # (Unstructured loaders can sometimes create multiple docs from one file)
            for doc in loader.load():
                yield doc
        except Exception as e:
            logging.error(f"Failed to load or process {filename}: {e}")
            continue
    
    logging.info(f"Summary: {new_files_found} new files to process, {skipped_existing} existing files skipped")

def split_documents(documents: List[Document]) -> List[Document]:
    """
    Takes a list of documents and splits them into smaller chunks.
    """
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=config.CHUNK_SIZE,
        chunk_overlap=config.CHUNK_OVERLAP
    )
    logging.info("Splitting documents into chunks...")
    chunks = text_splitter.split_documents(documents)
    logging.info(f"Total chunks created: {len(chunks)}")
    
    # Clean all chunks to remove null bytes
    cleaned_chunks = [clean_document(chunk) for chunk in chunks]
    return cleaned_chunks

def add_chunks_to_vectorstore(chunks: List[Document]):
    """
    Embeds chunks and adds them to the PGVector store using LangChain.
    This handles table creation, embedding, and insertion automatically.
    """
    if not chunks:
        logging.info("No new chunks to add to the vector store.")
        return

    logging.info(f"Adding {len(chunks)} new chunks to the vector store...")

    # Use the same embedding model as in retrieval
    embeddings = OpenAIEmbeddings(model=config.EMBEDDING_MODEL)

    # Process in batches to avoid token limits
    batch_size = config.EMBEDDING_BATCH_SIZE
    for i in range(0, len(chunks), batch_size):
        batch = chunks[i:i + batch_size]
        logging.info(f"Processing batch {i//batch_size + 1} ({len(batch)} chunks)...")
        
        # Add documents without deleting existing collection
        PGVector.from_documents(
            documents=batch,
            embedding=embeddings,
            collection_name=config.COLLECTION_NAME,
            connection_string=config.DATABASE_URL,
            pre_delete_collection=False,  # Never delete existing data
        )
    
    logging.info(f"Successfully added {len(chunks)} chunks to the vector store.")

if __name__ == "__main__":
    logging.info("--- Starting Data Ingestion Pipeline ---")

    try:
        # Step 1: Check what documents already exist in the database
        session = get_db_session()
        existing_files = get_existing_documents(session)
        session.close()
        
        # Step 2: Load only new documents from the data directory
        documents = list(load_documents_from_directory(config.DATA_DIR, skip_files=existing_files))
        
        # Step 3: Split documents into processable chunks
        if documents:
            chunks = split_documents(documents)
            
            # Step 4: Add the new chunks to the vector store
            if chunks:
                add_chunks_to_vectorstore(chunks)
            else:
                logging.info("No chunks generated from the new documents.")
        else:
            logging.info("No new documents found to process.")
            
    except Exception as e:
        logging.error(f"An error occurred during the ingestion process: {e}", exc_info=True)
    finally:
        logging.info("--- Data Ingestion Pipeline Finished ---") 

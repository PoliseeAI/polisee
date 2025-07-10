# ingest.py
import os
import logging
from typing import List, Iterator, Set, Optional
import time

# Import SQLAlchemy components for database interaction
# Note: These are no longer needed with the PGVector approach
# from sqlalchemy import create_engine, text
# from sqlalchemy.orm import sessionmaker, Session

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

# Note: The get_db_session and get_existing_documents functions are no longer needed
# with the PGVector approach, which handles its own database operations

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
    return chunks

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
        
        # Use pre_delete_collection only on the first batch
        PGVector.from_documents(
            documents=batch,
            embedding=embeddings,
            collection_name=config.COLLECTION_NAME,
            connection_string=config.DATABASE_URL,
            pre_delete_collection=(i == 0),  # Only delete on first batch
        )
    
    logging.info(f"Successfully added {len(chunks)} chunks to the vector store.")

if __name__ == "__main__":
    logging.info("--- Starting Data Ingestion Pipeline ---")

    try:
        # Step 1: Load all documents from the data directory.
        # The new approach will re-ingest everything cleanly each time
        # because pre_delete_collection is set to True.
        documents = list(load_documents_from_directory(config.DATA_DIR))
        
        # Step 2: Split documents into processable chunks
        chunks = split_documents(documents)
        
        # Step 3: Add the new chunks to the vector store
        if chunks:
            add_chunks_to_vectorstore(chunks)
        else:
            logging.info("No new documents found to process.")
            
    except Exception as e:
        logging.error(f"An error occurred during the ingestion process: {e}", exc_info=True)
    finally:
        logging.info("--- Data Ingestion Pipeline Finished ---") 

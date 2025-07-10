# ingest.py
import os
import logging
from typing import List, Iterator

# Import SQLAlchemy components for database interaction
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session

# Import LangChain components for document loading, splitting, and embedding
from langchain_community.document_loaders import PyMuPDFLoader, TextLoader, UnstructuredMarkdownLoader
from langchain_core.documents import Document
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings

# Import our application's configuration
import config

# --- Logging Setup ---
# This sets up a simple way to print informative messages to the console.
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def get_db_session() -> Session:
    """Creates and returns a new SQLAlchemy database session."""
    engine = create_engine(config.DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return SessionLocal()

def clear_database(session: Session):
    """Clears all data from the documents and chunks tables."""
    logging.info("Clearing existing data from database...")
    # The 'CASCADE' keyword in the schema ensures that when 'documents' is cleared,
    # all related 'chunks' are also deleted.
    session.execute(text("TRUNCATE TABLE documents CASCADE"))
    session.commit()
    logging.info("Database cleared successfully.")

def load_documents_from_directory(directory: str) -> Iterator[Document]:
    """
    Loads all supported documents (.txt, .pdf, .md) from a directory and yields them one by one.
    """
    logging.info(f"Scanning for documents in '{directory}'...")
    for filename in os.listdir(directory):
        filepath = os.path.join(directory, filename)
        
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
            logging.info(f"Loading document: {filename}")
            # The loader returns a list of documents, yield each one
            # (Unstructured loaders can sometimes create multiple docs from one file)
            for doc in loader.load():
                yield doc
        except Exception as e:
            logging.error(f"Failed to load or process {filename}: {e}")
            continue

def split_documents(documents: Iterator[Document]) -> List[Document]:
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

def insert_data_into_db(session: Session, chunks: List[Document]):
    """
    Inserts document and chunk data into the database.
    """
    logging.info("Preparing to insert data into the database...")
    
    # Use OpenAI to create embeddings for each chunk
    embeddings = OpenAIEmbeddings(model=config.EMBEDDING_MODEL)
    
    # Keep track of which documents we've already added to the DB
    # to avoid creating duplicate document entries.
    documents_in_db = {}

    # Track chunk index per document
    chunk_indices = {}
    
    for chunk in chunks:
        # The 'source' metadata from LangChain loaders contains the file path
        file_name = os.path.basename(chunk.metadata.get("source", "Unknown"))

        # If we haven't seen this document before, create an entry for it
        if file_name not in documents_in_db:
            logging.info(f"Adding document to DB: {file_name}")
            # The schema has a 'document_type' field, let's get it from the extension
            doc_type = file_name.split('.')[-1]
            # Use raw SQL to insert the document and get its generated ID back
            result = session.execute(
                text("INSERT INTO documents (file_name, document_type) VALUES (:file_name, :doc_type) RETURNING id"),
                {"file_name": file_name, "doc_type": doc_type}
            )
            document_id = result.scalar_one()
            documents_in_db[file_name] = document_id
            chunk_indices[file_name] = 0
        
        document_id = documents_in_db[file_name]
        chunk_index = chunk_indices[file_name]
        chunk_indices[file_name] += 1

        # Get the vector embedding for the chunk's content
        chunk_embedding = embeddings.embed_query(chunk.page_content)

        # Insert the chunk data, including its text, parent document ID, and vector
        session.execute(
            text("""
                INSERT INTO chunks (document_id, chunk_text, embedding, chunk_index) 
                VALUES (:doc_id, :text, :embedding, :index)
            """),
            {
                "doc_id": document_id,
                "text": chunk.page_content,
                # pgvector expects a string representation of the list
                "embedding": str(chunk_embedding),
                "index": chunk_index
            }
        )

    logging.info("Committing all changes to the database...")
    session.commit()
    logging.info("Data insertion complete.")

if __name__ == "__main__":
    logging.info("--- Starting Data Ingestion Pipeline ---")
    
    # Step 1: Establish a database connection
    db_session = get_db_session()
    
    try:
        # Step 2: Clear any old data
        clear_database(db_session)
        
        # Step 3: Load documents from the data directory
        documents = load_documents_from_directory(config.DATA_DIR)
        
        # Step 4: Split documents into processable chunks
        chunks = split_documents(documents)
        
        # Step 5: Insert the new data into the database
        if chunks:
            insert_data_into_db(db_session, chunks)
        else:
            logging.warning("No documents found or processed. Database is empty.")
            
    except Exception as e:
        logging.error(f"An error occurred during the ingestion process: {e}", exc_info=True)
        # Rollback any partial changes if an error occurs
        db_session.rollback()
    finally:
        # Always close the database connection
        db_session.close()
        logging.info("--- Data Ingestion Pipeline Finished ---") 

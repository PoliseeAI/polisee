# config.py
import os
from dotenv import load_dotenv

# Load environment variables from a .env file
load_dotenv()

# --- Database Configuration ---
# Constructs the full database URL from environment variables.
# This is the standard format for SQLAlchemy.
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "postgres")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "polgen")

DATABASE_URL = f"postgresql+psycopg2://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# --- OpenAI API Configuration ---
# Retrieves the OpenAI API key from environment variables.
# The script will fail if this is not set in the .env file.
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise ValueError("OPENAI_API_KEY environment variable not set.")

# --- Data and Processing Configuration ---
# Defines the location of the source documents.
DATA_DIR = "data"

# Defines parameters for splitting text into chunks.
# CHUNK_SIZE is the maximum size of a chunk in characters.
# CHUNK_OVERLAP is the number of characters to overlap between consecutive chunks.
CHUNK_SIZE = 1000
CHUNK_OVERLAP = 200

# Defines the specific OpenAI model to use for creating embeddings.
EMBEDDING_MODEL = "text-embedding-3-small" 

# Batch size for embedding API calls
# OpenAI allows up to 2048 inputs per call, but we use a conservative value
# to avoid token limits and reduce the impact of failures
EMBEDDING_BATCH_SIZE = int(os.getenv("EMBEDDING_BATCH_SIZE", "100")) 

# Collection name for PGVector store
COLLECTION_NAME = "polgen_documents" 
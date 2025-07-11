# Data Ingestion Pipeline

This is the data ingestion pipeline for the PolGen CLI application. It processes documents from the `data/` directory and populates a PostgreSQL database with text chunks and their vector embeddings.

## Prerequisites

1. PostgreSQL database with pgvector extension
2. Python 3.9+
3. OpenAI API key

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Create a `.env` file with your configuration:
```bash
# Database Configuration
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=polgen

# OpenAI API Configuration
OPENAI_API_KEY=your_openai_api_key_here
```

3. Create the database schema:
```bash
psql -d polgen -U postgres -f schema.sql
```

## Usage

Run the ingestion script:
```bash
python ingest.py
```

The script will:
1. Clear any existing data from the database
2. Scan the `data/` directory for supported files (.txt, .pdf, .md)
3. Extract text from each document
4. Split text into chunks (1000 chars with 200 char overlap)
5. Generate vector embeddings using OpenAI's text-embedding-3-small model
6. Store everything in the PostgreSQL database

## Supported File Types

- `.txt` - Plain text files
- `.pdf` - PDF documents (digital text only, not scanned)
- `.md` - Markdown files

## Notes

- The script is idempotent - running it multiple times will always result in the same database state
- Each run completely clears and repopulates the database
- Progress is logged to the console
- Large PDFs may take some time to process due to embedding generation 
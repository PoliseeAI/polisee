# PRD: Local Data Ingestion & Processing Pipeline

-   **Feature:** Core Data Pipeline for CLI Proof-of-Concept
-   **Status:** To Do
-   **Author:** Lead Developer
-   **Stakeholders:** Product Manager

---

### 1. Introduction/Overview

This project will create the foundational data backend for the "PolGen" CLI proof-of-concept. Before the CLI can answer any questions, we need a reliable way to get our source documents into a format the AI can understand. This involves extracting text from files (like PDFs and Markdown), breaking it into small pieces ("chunks"), and storing both the text and its semantic meaning (as a vector embedding) in a queryable vector store within a local PostgreSQL database.

This feature will be a set of scripts that populates a local PostgreSQL database from a folder of source documents.

**The Goal:** To create a simple, repeatable, local-only data pipeline that processes a curated set of documents and makes them queryable for the main CLI application.

### 2. Goals

*   Successfully process a local folder containing a mix of `.txt`, `.pdf`, and `.md` files.
*   Extract clean, readable text from all three document types, leveraging Markdown structure where available.
*   Populate a local PostgreSQL vector store with processed text chunks.
*   Ensure that each chunk in the database retains its source file metadata for traceability.
*   Ensure the entire process can be run from a single command and incrementally adds only new documents.
*   Handle large document sets by batching embedding requests to stay within API limits.
*   Maintain existing embeddings to avoid unnecessary API calls and preserve database continuity.

### 3. User Stories

*   **As a Developer building the CLI, I want to run a single script to 'seed' my local database with all the necessary policy documents so that I have a consistent data environment to test the AI's question-answering capabilities.**
*   **As a Developer, I want the pipeline to automatically extract text from PDFs and intelligently parse Markdown files so that I don't have to manually copy-paste content from complex documents.**
*   **As a Product Manager, I want to be able to add a new PDF, TXT, or MD file to a folder and re-run the script so that only the new document is processed without affecting existing data.**
*   **As a Developer, I want the ingestion process to handle large document sets without hitting API token limits so that I can process extensive policy documents.**
*   **As a Developer, I want the system to preserve existing embeddings so that I don't waste API calls re-processing documents that are already in the database.**

### 4. Functional Requirements

The system will be a Python script (e.g., `ingest.py`) that is run manually from the command line.

**Data Source & Handling:**
1.  The script MUST read all files from a pre-defined local directory named `data/`.
2.  The script MUST be able to process files with `.txt`, `.pdf`, and `.md` extensions. It should ignore all other file types.

**Database Interaction:**
3.  The script MUST connect to a local PostgreSQL database using credentials specified in the environment.
4.  The script MUST query the existing vector store to identify which documents have already been processed.
5.  The script MUST only process documents that are not already present in the database, preserving existing embeddings.
6.  The script MUST use the LangChain PGVector integration to manage data storage and will be responsible for populating a specific collection within the vector store.

**Text Processing:**
7.  For `.txt` files, the system MUST read the raw text content directly.
8.  For `.pdf` files, the system MUST use a library to extract the text content from the document.
9.  For `.md` (Markdown) files, the system MUST use a specialized loader that interprets Markdown syntax to create more semantically coherent text outputs.
10. The extracted text from each document MUST be split into smaller, overlapping text chunks.

**Vectorization & Storage:**
11. For each text chunk from new documents, the system MUST use the LangChain integration with the OpenAI API to generate a vector embedding.
12. The script MUST process chunks in configurable batches (e.g., 100 chunks per batch) to avoid exceeding OpenAI's token limits (300,000 tokens per request).
13. The script MUST use `PGVector.from_documents` for each batch with `pre_delete_collection=False` to preserve existing data.
14. The script MUST provide progress feedback for each batch being processed.
15. The script MUST track and report how many documents were skipped (already processed) versus how many new documents were added.

### 5. Non-Goals (Out of Scope)

*   **No Automated Crawlers:** This script will **NOT** fetch any data from the internet. It only processes files that are already present in the local `data/` folder.
*   **No Cloud Services:** We will **NOT** use any cloud storage (like S3) or cloud databases. Everything runs locally.
*   **No Complex PDF Parsing:** The initial version will use a standard library for PDF text extraction. It will **NOT** handle complex layouts, tables, images, or scanned (non-digital) PDFs. If a PDF has no extractable text, it can be skipped.
*   **No UI:** This is a backend-only script. There is no user interface. Progress will be indicated by printing messages to the console.
*   **No Document Update Detection:** The script does not detect if a document's content has changed. It only checks if a filename exists in the database. To update a document, it must be manually removed from the database first.

### 6. Design Considerations

*   **Console Output:** The script should provide clear feedback in the console as it runs. Example:
    ```
    Starting data ingestion...
    Found 3 documents already in the database
    Scanning for documents in 'data/' folder...
    Skipping existing file: doc1_zoning_code.pdf
    Skipping existing file: doc2_policy_brief.md
    Loading new document: doc3_new_regulations.pdf
    Loading new document: doc4_guidelines.txt
    Summary: 2 new files to process, 2 existing files skipped
    Split documents into 45 total chunks.
    Processing batch 1 (45 chunks)...
    Successfully added 45 chunks to the vector store.
    Ingestion complete. Database is ready.
    ```
*   **Database Schema:** The script will rely on the `langchain` library to manage the database schema. It will automatically create the necessary tables for the vector store collection if they do not already exist. It does not depend on a pre-existing schema file.
*   **Batch Size Configuration:** The batch size for embedding requests should be configurable via environment variable (e.g., `EMBEDDING_BATCH_SIZE`) with a sensible default (e.g., 100) to balance between efficiency and API limits.

### 7. Technical Considerations

*   **Language:** Python 3.9+.
*   **Key Libraries:**
    *   `psycopg2-binary`: To connect to PostgreSQL.
    *   `sqlalchemy`: To make database interactions easier.
    *   `pgvector`: For storing vectors in PostgreSQL.
    *   `PyMuPDF`: For PDF text extraction.
    *   `unstructured[md]`: For intelligent parsing of Markdown files.
    *   `langchain`: To assist with document loading, text splitting, and vector store management.
    *   `langchain-openai`: For the OpenAI embeddings integration.
*   **Configuration:** All sensitive information (database credentials, OpenAI API key) MUST be loaded from a `.env` file. The embedding batch size should also be configurable.
*   **Idempotency:** The script must be safely re-runnable. Running it multiple times should only add new documents, never duplicate existing ones. This is achieved by checking existing documents before processing.
*   **Error Handling:** The script should handle API rate limits and token limit errors gracefully, providing clear error messages about batch size adjustments if needed.

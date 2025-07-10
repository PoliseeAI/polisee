# PRD: Local Data Ingestion & Processing Pipeline

-   **Feature:** Core Data Pipeline for CLI Proof-of-Concept
-   **Status:** To Do
-   **Author:** Lead Developer
-   **Stakeholders:** Product Manager

---

### 1. Introduction/Overview

This project will create the foundational data backend for the "PolGen" CLI proof-of-concept. Before the CLI can answer any questions, we need a reliable way to get our source documents into a format the AI can understand. This involves extracting text from files (like PDFs and Markdown), cleaning it, breaking it into small pieces ("chunks"), and storing both the text and its "meaning" (as a vector) in a local database.

This feature will be a set of scripts that populates a local PostgreSQL database from a folder of source documents.

**The Goal:** To create a simple, repeatable, local-only data pipeline that processes a curated set of documents and makes them queryable for the main CLI application.

### 2. Goals

*   Successfully process a local folder containing a mix of `.txt`, `.pdf`, and `.md` files.
*   Extract clean, readable text from all three document types, leveraging Markdown structure where available.
*   Populate a local PostgreSQL database with structured metadata about each source document.
*   Populate the same database with the text chunks and their corresponding vector embeddings.
*   Ensure the entire process can be run from a single command and can be re-run to clear and re-populate the database.

### 3. User Stories

*   **As a Developer building the CLI, I want to run a single script to 'seed' my local database with all the necessary policy documents so that I have a consistent data environment to test the AI's question-answering capabilities.**
*   **As a Developer, I want the pipeline to automatically extract text from PDFs and intelligently parse Markdown files so that I don't have to manually copy-paste content from complex documents.**
*   **As a Product Manager, I want to be able to add a new PDF, TXT, or MD file to a folder and re-run the script so that we can easily test the system with new source documents.**

### 4. Functional Requirements

The system will be a Python script (e.g., `ingest.py`) that is run manually from the command line.

**Data Source & Handling:**
1.  The script MUST read all files from a pre-defined local directory named `data/`.
2.  The script MUST be able to process files with `.txt`, `.pdf`, and `.md` extensions. It should ignore all other file types.

**Database Interaction:**
3.  The script MUST connect to a local PostgreSQL database using credentials specified in the environment.
4.  Before processing, the script MUST completely clear all data from the `documents` and `chunks` tables to ensure a fresh start.
5.  For each file processed, the script MUST create one corresponding record in the `documents` table. This record must include the file's name and its type (`pdf`, `txt`, or `md`).

**Text Processing:**
6.  For `.txt` files, the system MUST read the raw text content directly.
7.  For `.pdf` files, the system MUST use a library to extract the text content from the document.
8.  For `.md` (Markdown) files, the system MUST use a specialized loader that interprets Markdown syntax to create more semantically coherent text outputs.
9.  The extracted text from each document MUST be split into smaller, overlapping text chunks (e.g., paragraphs of ~400 words with a 50-word overlap).

**Vectorization & Storage:**
10. For each text chunk, the system MUST use the OpenAI API to generate a vector embedding.
11. Each chunk MUST be saved as a record in the `chunks` table. This record must include the text of the chunk, a reference back to its parent document (`document_id`), and its vector embedding.

### 5. Non-Goals (Out of Scope)

*   **No Automated Crawlers:** This script will **NOT** fetch any data from the internet. It only processes files that are already present in the local `data/` folder.
*   **No Cloud Services:** We will **NOT** use any cloud storage (like S3) or cloud databases. Everything runs locally.
*   **No Complex PDF Parsing:** The initial version will use a standard library for PDF text extraction. It will **NOT** handle complex layouts, tables, images, or scanned (non-digital) PDFs. If a PDF has no extractable text, it can be skipped.
*   **No UI:** This is a backend-only script. There is no user interface. Progress will be indicated by printing messages to the console.
*   **No "Delta" or "Update" Logic:** The script does not need to know which files are new. It will always perform a full wipe-and-reload of the database.

### 6. Design Considerations

*   **Console Output:** The script should provide clear feedback in the console as it runs. Example:
    ```
    Starting data ingestion...
    Clearing existing data from database...
    Found 5 documents to process in 'data/' folder.
    Processing 'doc1_zoning_code.pdf'...
      - Extracted 15,000 characters.
      - Split into 42 chunks.
      - Stored document and 42 chunks in database.
    Processing 'doc2_policy_brief.md'...
    ...
    Ingestion complete. Database is ready.
    ```
*   **Database Schema:** The script will populate a pre-existing schema. It will not be responsible for creating tables. The required tables are `documents` and `chunks`.

### 7. Technical Considerations

*   **Language:** Python 3.9+.
*   **Key Libraries:**
    *   `psycopg2-binary`: To connect to PostgreSQL.
    *   `sqlalchemy`: To make database interactions easier (ORM).
    *   `pgvector`: For storing vectors in PostgreSQL.
    *   `PyMuPDF`: For PDF text extraction.
    *   `unstructured[md]`: For intelligent parsing of Markdown files.
    *   `langchain`: To assist with document loading, text splitting, and embedding generation.
    *   `langchain-openai`: For the OpenAI embeddings integration.
*   **Configuration:** All sensitive information (database credentials, OpenAI API key) MUST be loaded from a `.env` file.
*   **Idempotency:** The script must be safely re-runnable. Running it ten times should result in the same database state as running it once. This is achieved by the "clear all data" step at the beginning.

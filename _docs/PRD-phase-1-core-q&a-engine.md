# PRD: PolGen Phase 1 - Core Q&A Engine

## Introduction/Overview

This document outlines the requirements for Phase 1 of the **PolGen** application. PolGen is a research assistant designed to help policy analysts.

**Problem:** A policy analyst has a large collection of research documents (reports, studies, articles) and needs to quickly find answers to specific questions based *only* on the content of those documents.

**Feature:** We will build a command-line interface (CLI) tool that takes a user's question, searches a pre-existing database of documents, and uses an AI model (LLM) to generate a concise, evidence-based answer.

**Goal:** To create a functional, single-shot Q&A engine that can answer a user's question using a private knowledge base, demonstrating the core value of the PolGen concept.

---

## Goals

*   **Functionality:** A user can ask a question from their terminal and receive an answer synthesized from the document database.
*   **Reliability:** The system provides answers based strictly on the provided documents and indicates when an answer cannot be found.
*   **Usability:** The CLI tool is simple to use and provides helpful feedback to the user.
*   **Testability:** The tool includes a "verbose" mode to help developers inspect the intermediate steps and verify the quality of the search results.

---

## User Stories

*   **As a policy analyst, I want to ask a question in my terminal** so that I can quickly get an answer without leaving my development environment.
*   **As a policy analyst, I want the answer to be based only on my trusted documents** so that I can be confident the information is accurate and properly sourced.
*   **As a researcher, when I ask a question about a topic not in my documents, I want the tool to tell me it couldn't find an answer** so that I am not misled by information from outside the knowledge base.
*   **As a developer of this tool, I want to see which document chunks are being retrieved for a given question** so that I can debug and improve the search quality.

---

## Functional Requirements

### FR1: CLI Invocation and Argument Parsing
-   The application shall be a Python script executable from the command line (e.g., `python main.py ...`).
-   The script must accept a user's question as one or more command-line arguments.
-   The script must concatenate all arguments following the script name into a single question string. For example, `python main.py what is rent control?` should treat `"what is rent control?"` as the question.
-   If the script is executed with no arguments, it must print a usage message to the console (e.g., `Usage: python main.py "Your question here"`) and exit without error.

### FR2: User Feedback
-   Upon receiving a valid question, the script must immediately print a status message to the console, such as `> Searching knowledge base and generating response...`.

### FR3: Knowledge Base Search
-   The system must connect to a pre-existing PostgreSQL database named `polgen`.
-   It must perform a similarity search on the `chunks` table to find text chunks relevant to the user's question.
-   The search must retrieve the **top 5** most relevant chunks.
-   For each retrieved chunk, the system must retain both the text (`chunk_text`) and its source document metadata (specifically the `file_name` from the `documents` table).

### FR4: AI-Powered Answer Generation
-   The system must use the `gpt-4-turbo` model from OpenAI to generate the final answer.
-   The system must construct a prompt for the AI model using the following precise template:
    ```
    System: You are an AI policy research assistant. Your task is to answer the user's question based *only* on the provided context. If the context does not contain the answer, state that you could not find the information in the knowledge base.

    Human:
    Here is the context retrieved from the knowledge base:
    ---
    [CONTEXT]
    ---
    Based on the context above, please answer the following question:
    [QUESTION]
    ```
-   The `[CONTEXT]` placeholder shall be filled with the text of the 5 chunks retrieved in FR3.
-   The `[QUESTION]` placeholder shall be filled with the user's question from FR1.

### FR5: Handling No Search Results
-   If the knowledge base search (FR3) returns zero relevant chunks, the system **must not** call the AI model.
-   Instead, it must print a standard message to the console, such as: `I could not find any information related to your question in the knowledge base.` and exit.

### FR6: Debugging and Verbose Mode
-   The application must support an optional `--verbose` flag.
-   If the `--verbose` flag is present, the script must first print the raw text content of the 5 chunks retrieved from the database before printing the final AI-generated answer. Each chunk should be clearly separated.

### FR7: Output
-   The final, AI-generated answer shall be printed to the console.

---

## Non-Goals (Out of Scope for Phase 1)

*   **No Interactive Chat:** The tool will execute once per question and then exit. It will not have a conversational memory or an interactive loop.
*   **No Project Management:** The concept of "projects" will not be implemented. The tool is stateless.
*   **No Document Creation/Editing:** The tool will only read from the database; it will not create or modify any files.
*   **No Live Web Search:** All information comes exclusively from the pre-populated PostgreSQL database.
*   **No Citations in Output:** While we retrieve source metadata, the final answer in this phase will not include formatted citations (e.g., `[source: file.pdf]`).

---

## Design Considerations

*   This is a Command-Line Interface (CLI) application. No graphical user interface (GUI) is required.
*   Output should be plain text, formatted for easy reading in a standard terminal.

---

## Technical Considerations

*   **Language:** Python 3.
*   **Dependencies:** A `requirements.txt` file will be provided and must be used. It will include:
    *   `typer` (for CLI argument parsing)
    *   `openai` (for interacting with the LLM)
    *   `langchain-openai`, `langchain-community` (for AI and database integration)
    *   `pgvector`, `psycopg2-binary` (for connecting to PostgreSQL)
    *   `python-dotenv` (for managing environment variables)
*   **Configuration:** The script must load the `OPENAI_API_KEY` and database connection details from a `.env` file at the root of the project. These credentials must not be hardcoded in the source code.
*   **Pre-existing Components:** You can assume the `schema.sql` and the data ingestion script are complete and the `polgen` database is already populated with data.


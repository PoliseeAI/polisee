# PRD: PolGen Phase 2 - Interactive Project Sessions

## Introduction/Overview

This document outlines the requirements for Phase 2 of the PolGen application. This phase will transform the existing single-shot Q&A script into a stateful, interactive research assistant that supports project-based work and conversational memory.

**Problem:** Policy analysts need to conduct research over multiple sessions and maintain context. The current single-shot tool has no memory, forcing users to start fresh with every question. It lacks a persistent workspace for ongoing research tasks.

**Feature:** We will build an interactive command-line interface (CLI) that allows users to create and load distinct "projects." Each project will act as a workspace with its own persistent conversation history, enabling continuous, multi-turn dialogue with the AI.

**Goal:** To create a demoable, interactive application where a user can load a project, have a contextual conversation with the AI research assistant, and have that conversation's history saved reliably within their project folder.

---

## Goals

*   **Functionality:** A user can create, load, and switch between different research projects.
*   **Interactivity:** The application provides a continuous chat interface (a REPL) that remembers the context of the current conversation.
*   **Persistence:** The history of each conversation is saved to a file specific to its project, ensuring no work is lost.
*   **Robustness:** The application handles common user errors and edge cases gracefully (e.g., invalid input, attempting to load non-existent projects).

---

## User Stories

*   **As a policy analyst, I want to create a new project for each topic I research** so that I can keep my conversations and future documents organized and separate.
*   **As a researcher, I want to have a continuous, back-and-forth conversation with the AI** so that I can ask follow-up questions without having to repeat context.
*   **As a user, when I close the application and re-open it later, I want my project and its past conversations to be saved** so I can review my research history, even though each new session starts a fresh conversation.
*   **As a user, I want the application to handle crashes or accidental closures (like `Ctrl+C`) gracefully** so that I don't lose the history from my current session.

---

## Functional Requirements

### FR1: Application Startup and Project Selection
1.  On startup, the application must check if a `projects/` directory exists in the application root. If not, it must be created automatically.
2.  The application must then prompt the user to either `load` an existing project or `create` a new one. Example: `Load project or create new one? [load/create]:`.
3.  If the user's input is anything other than `load` or `create`, the application must re-display the prompt until valid input is received.

### FR2: Project Creation
1.  If the user chooses `create`, the application must prompt them for a project name.
2.  The user-provided **project name** can contain spaces and mixed case (e.g., "Housing Affordability in Austin").
3.  The system must generate a unique, filesystem-safe **folder name** from the project name. The normalization process is:
    *   Convert the name to lowercase.
    *   Replace spaces with hyphens.
    *   Remove any characters that are not alphanumeric or hyphens.
    *   Example: "Housing Affordability in Austin" -> "housing-affordability-in-austin".
4.  The system must check if a folder with the normalized name already exists in the `projects/` directory. If it does, append a number to create a unique folder name (e.g., `housing-affordability-in-austin-1`, `housing-affordability-in-austin-2`, etc.).
5.  The system must create the new project folder (e.g., `projects/housing-affordability-in-austin/`).
6.  Inside the new folder, the system must create two files:
    *   `project.json`: Contains metadata. It must have at least one key, `name`, holding the original, un-normalized project name. E.g., `{"name": "Housing Affordability in Austin"}`.
    *   `conversation_history.json`: An empty JSON file, initialized with an empty list `[]`.

### FR3: Project Loading
1.  If the user chooses `load`, the system must list all available projects by scanning the subdirectories inside `projects/`.
2.  The user will then be prompted to enter the name of the project they wish to load.
3.  If the user chooses `load` but no projects exist, the system must print a message (e.g., "No projects found. Please create one first.") and return to the initial `[load/create]` prompt.

### FR4: Interactive Chat Session (REPL)
1.  Once a project is loaded or created, the application must enter an interactive loop (a REPL).
2.  The command prompt must display the name of the currently loaded project. Example: `(Housing Affordability in Austin) > `.
3.  The application will wait for user input. After the user types a message and presses Enter, the application will process it.
4.  The user can exit the application by typing `/exit` or `quit`.
5.  The application must gracefully handle `Ctrl+C` (`KeyboardInterrupt`) by triggering the same exit procedure as `/exit`.

### FR5: Conversational Memory and AI Interaction
1.  The system must maintain the history of the current conversation in memory.
2.  The history must be stored as a list of objects, following the OpenAI message format: `[{"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}]`.
3.  When sending a request to the AI model, the system must manage the context window as follows:
    *   A fixed token budget must be reserved for new context retrieved from the knowledge base (RAG search results).
    *   A separate token budget must be reserved for the conversation history.
    *   If the conversation history exceeds its budget, the oldest messages must be removed from the prompt until it fits. New RAG context is always prioritized over old conversation history.
4.  The AI's response is printed to the console for the user.

### FR6: Persistent History Saving
1.  After **every** user/AI turn is complete, the application must immediately save the entire updated conversation history from memory to the `conversation_history.json` file within the current project's folder. This overwrites the file to ensure it's always up-to-date.
2.  When a new session starts (i.e., the application is run again), the `conversation_history.json` file is **not** loaded into the active conversation memory. Each session begins with a fresh, empty conversation history, but the file on disk preserves the record of past conversations for archival purposes.

---

## Non-Goals (Out of Scope for Phase 2)

*   **No Document Creation:** Users cannot create or edit `.md` or other document files. The only file I/O is for `project.json` and `conversation_history.json`.
*   **No Intra-Project Awareness:** The AI will not be aware of any files inside the project folder other than the active conversation history. It cannot read its own past conversation history from the file.
*   **No Advanced Commands:** The only commands are for exiting the application (`/exit`, `quit`). Slash commands for other actions like `/create`, `/list`, or `/edit` are not part of this phase.
*   **No Complex UI:** The interface will be a simple text-based REPL. There will be no loading spinners or complex formatting; the prompt can hang while waiting for the AI response.

---

## Design Considerations

*   **CLI Prompt:** The prompt should be clear and provide context. The format `(Project Name) > ` is required.
*   **File Structure:** The project directory structure must be strictly followed as laid out in the requirements.
    ```
    projects/
    └── housing-affordability-in-austin/
        ├── project.json
        └── conversation_history.json
    ```

## Technical Considerations

*   **State Management:** A dedicated `ProjectManager` module should be created to handle all file system interactions (creating/loading projects, reading/writing JSON files).
*   **Orchestration:** An `Orchestrator` module should be created to manage the application's main loop, handle user input, and coordinate between the `ProjectManager` and the AI/RAG modules.
*   **Dependencies:** Continue using `psycopg2`, `pgvector`, `langchain`, and `openai`. No new major dependencies are expected.

## Development Plan: PolGen

### Phase 1: The Core Q&A Engine

**Goal:** To establish a foundational, single-shot Command Line Interface (CLI) tool that can answer a specific question by searching a pre-populated knowledge base. This phase validates the core RAG pipeline.

**Key Features:**
*   Stateless CLI application that runs once and exits.
*   Accepts a user's question as a command-line argument.
*   Performs a similarity search against the PostgreSQL database.
*   Uses a `gpt-4-turbo` model to synthesize an answer from the retrieved context.
*   Includes a `--verbose` mode for debugging search results.
*   Handles cases where no relevant information is found in the database.

**User Experience:**
The user interacts with the tool from their terminal in a single command. It's simple and direct, with no memory between queries.
```bash
# Standard query
$ python main.py "What does the literature say about inclusionary zoning?"
> Searching knowledge base and generating response...
> Inclusionary zoning is a policy that requires developers to set aside a certain percentage of units in new housing developments for lower-income residents...

# Verbose query for debugging
$ python main.py "What is a land value tax?" --verbose
> --- Retrieved Context Chunks ---
> Chunk 1 (source: land_tax_report.pdf): A land value tax (LVT) is a levy on the unimproved value of land...
> Chunk 2 (source: georgist_economics.txt): Unlike property taxes, an LVT disregards the value of buildings, personal property, and other improvements...
> --- Generating Response ---
> A land value tax, or LVT, is a levy on the unimproved value of a piece of land. It differs from a standard property tax by not taxing the value of buildings or improvements on the land...
```

**Technical Implementation Plan:**
1.  **Project Setup:**
    *   Create `main.py` as the entry point.
    *   Set up `.env` for API keys and DB credentials.
    *   Create a `requirements.txt` file (`typer`, `openai`, `langchain`, `pgvector`, etc.).
2.  **CLI Interface (`main.py`):**
    *   Use `typer` to create the CLI application.
    *   Define a main function that accepts a `question: str` argument and a `--verbose: bool` flag.
    *   Implement basic input validation (e.g., show usage if no question is provided).
3.  **Knowledge Base Logic (`knowledge_base.py`):**
    *   Create a `KnowledgeBase` class.
    *   The `__init__` method will establish and hold the connection to the PostgreSQL database.
    *   The `search(query)` method will take a question, embed it, perform the vector search, and return the top 5 chunks with their source document names.
4.  **Generation Logic (`main.py` for now):**
    *   Create a function `generate_answer(context, question)`.
    *   This function will format the precise prompt template from the PRD, call the OpenAI API, and return the final text response.
5.  **Main Execution Flow (`main.py`):**
    *   Parse arguments.
    *   Instantiate `KnowledgeBase`.
    *   Call `kb.search(question)`.
    *   If verbose, print the raw chunks.
    *   If results exist, call `generate_answer()` and print the output.
    *   If no results, print the "not found" message.

**Demoable Outcome:** A functional CLI tool that can be demonstrated live to answer any question covered by the document corpus, proving the core technology works.

---

### Phase 2: The Interactive Session

**Goal:** To transform the single-shot script into a stateful, interactive application with project-based context and conversational memory.

**Key Features:**
*   Project creation (`/create-project <name>`) and loading.
*   An interactive REPL (Read-Evaluate-Print Loop) that persists until the user exits.
*   The chat prompt displays the current project name (e.g., `(housing-austin) >`).
*   Conversation history is maintained for the duration of the session.
*   Conversation history is saved to a `conversation_history.json` file within the project directory upon exit.

**User Experience:**
The application becomes a "place" to work. The user starts it once, loads a project, and can have a continuous back-and-forth conversation. The AI can answer follow-up questions that rely on the immediate context of the chat.

```bash
$ python main.py
> Load project or create new one? [load/create]: create
> Enter new project name: housing-austin
> Project 'housing-austin' created.
(housing-austin) > What are the main drivers of housing costs?
> The main drivers are land costs, construction materials, and restrictive zoning laws.
(housing-austin) > Tell me more about the last one.
> Restrictive zoning laws, such as single-family zoning or minimum lot sizes, limit the supply of new housing, which drives up prices...
(housing-austin) > /exit
> Saving session... Goodbye!
```

**Technical Implementation Plan:**
1.  **Refactor `main.py`:**
    *   Remove `typer` for single-shot questions.
    *   Implement the initial project selection menu.
    *   Create the main `while True:` REPL loop.
2.  **Create `ProjectManager` (`project_manager.py`):**
    *   Build the class to handle all file system I/O.
    *   `create_project(name)`: Creates `projects/{name}` dir, `project.json`, `conversation_history.json`.
    *   `load_project(name)`: Reads the JSON files into a `Project` data object.
    *   `save_conversation(project)`: Writes the current session's chat history to disk.
3.  **Create `Orchestrator` (`orchestrator.py`):**
    *   This module will be simple at first. It will take the user's input and the entire conversation history.
    *   It will pass the history and new question to a LangChain `ConversationalRetrievalChain` or similar.
    *   The chain will use the `KnowledgeBase` from Phase 1 as its retriever.
    *   The orchestrator receives the AI's response and returns it to the REPL.

**Demoable Outcome:** A live demo showing the creation of a project, a multi-turn conversation where the AI correctly understands follow-up questions, and verification that the `conversation_history.json` file is created and populated.

---

### Phase 3: Document Generation & Command Palette

**Goal:** To empower the user to create persistent artifacts (`.md` files) within their project using slash commands.

**Key Features:**
*   A command parser in the Orchestrator to distinguish chat from commands (e.g., input starting with `/`).
*   `/create <filename.md>`: Initiates a guided conversation to draft content for a new document.
*   `/save`: A command to explicitly save the drafted content to the specified file.
*   `/list`: Lists all documents (`.md` files) in the current project.
*   `/help`: Displays a list of available commands.

**User Experience:**
The user is no longer just a consumer of information; they are a creator. They can direct the AI to build structured documents like problem statements or literature reviews.

```bash
(housing-austin) > /create problem_statement.md
> OK, let's draft `problem_statement.md`. To start, what is the core problem we are trying to define?
(housing-austin) > The lack of affordable housing for middle-income families in Austin.
> Got it. Now, what key statistics or data points should we include to quantify this problem? I can search the knowledge base for you.
(housing-austin) > Find data on the median home price to median income ratio in Austin.
> Searching... Found it. The ratio is currently 9.1... [The AI drafts a paragraph] ... Does this look right?
(housing-austin) > Yes, looks good.
> Great. Anything else to add?
(housing-austin) > No, that's it for now.
> OK. Use `/save` to write this content to `problem_statement.md`.
(housing-austin) > /save
> Saved `problem_statement.md`.
(housing-austin) > /list
> Documents in this project:
> - problem_statement.md
```

**Technical Implementation Plan:**
1.  **Enhance `Orchestrator`:**
    *   In `handle_input`, add logic to check if `user_input.startswith('/')`.
    *   Create a dictionary to map commands (`/create`, `/list`) to handler functions (`_handle_create`, `_handle_list`).
    *   Implement a "mode" or "state" within the Orchestrator to handle the document drafting sub-conversation. For example, after `/create`, the state becomes `DRAFTING_DOCUMENT`.
2.  **Enhance `ProjectManager`:**
    *   Add `save_document(project, filename, content)` and `list_documents(project)` methods.
3.  **Refine `main.py`:**
    *   Ensure the REPL loop can handle multi-line outputs and presents the drafting conversation cleanly.

**Demoable Outcome:** A full workflow demo: A user starts the app, creates a new file, has a conversation with the AI to draft its content, saves the file, and lists it to confirm its creation. Open the `.md` file in a text editor to show the generated content.

---

### Phase 4: Intra-Project Awareness & Agentic Reasoning

**Goal:** To make the AI "aware" of the documents already created within the project, allowing it to use them as context for new tasks.

**Key Features:**
*   The AI can read from project files (e.g., `problem_statement.md`) to inform its responses.
*   Users can refer to project documents in their prompts (e.g., "Using my problem statement...").
*   Implementation of a true LangChain Agent with a set of tools.

**User Experience:**
This is a "wow" moment. The tool transforms from a research assistant into a thinking partner. It can build upon its own previous work, creating a powerful, cumulative research process.

```bash
(housing-austin) > /list
> Documents in this project:
> - problem_statement.md
(housing-austin) > Using the `problem_statement.md` file, draft a new document called `policy_options.md` that outlines three potential solutions.
> Roger that. Reading `problem_statement.md`... The problem is defined as a lack of middle-income housing. Now searching the knowledge base for policy solutions related to this...
> [Agent thinks and works, possibly showing its steps]
> OK, I have drafted three options based on your problem statement and the research:
> 1.  **Zoning Reform:** Specifically, abolishing single-family zoning...
> 2.  **Public Land Lease:** A program to lease city-owned land to non-profits...
> 3.  **Inclusionary Zoning:** ...
> Shall I `/save` this to `policy_options.md`?
```

**Technical Implementation Plan:**
1.  **Create `Agent` (`agent.py`):**
    *   This will be the new core of the reasoning logic, replacing the simple chain from Phase 2.
    *   Use LangChain's `create_openai_tools_agent` or a similar constructor.
2.  **Define Agent Tools:**
    *   **Knowledge Base Tool:** Wrap the `KnowledgeBase.search` method in a LangChain `Tool` with a clear description.
    *   **Project Reader Tool:** Wrap `ProjectManager.read_document` in a `Tool`.
    *   **Project Lister Tool:** Wrap `ProjectManager.list_documents` in a `Tool`.
3.  **Implement Context Manager:**
    *   This will be a helper function or class used by the Agent.
    *   It will intelligently assemble the prompt by combining chat history, user query, and (if a file is mentioned or relevant) the content of project files. It must be smart enough to summarize or search within a project file if it's too large for the context window.
4.  **Refactor `Orchestrator`:**
    *   Its main job for chat messages now becomes simpler: it calls the `AgentExecutor` with the user's input and the conversation history, and the agent handles the rest.

**Demoable Outcome:** A powerful demo showing the AI seamlessly integrating context from a user-created project file with new information retrieved from the main knowledge base to produce a novel, synthesized document.

---

### Phase 5: Refinement & Professional Polish

**Goal:** To add advanced features that improve usability, build user trust, and make the tool feel like a mature product.

**Key Features:**
*   **Surgical Editing:** An `/edit` command to make targeted changes to existing documents.
*   **Precise Citations:** The AI's output will include citations linking back to the source document (and ideally, the specific chunk or page).
*   **Enhanced Command Palette:** More robust command handling, possibly with suggestions.

**User Experience:**
The user gains fine-grained control over their work. Editing long documents becomes easy. The inclusion of citations makes the output verifiable and trustworthy, ready for use in real policy work.

```bash
(housing-austin) > /edit policy_options.md
> What change would you like to make to `policy_options.md`?
(housing-austin) > In the section on Zoning Reform, add a sentence about the political challenges.
> Understood. [Agent reads the file, performs a new search if needed, and re-drafts the section]
> How does this look?
> "1. **Zoning Reform:** ... This approach often faces significant political challenges from existing homeowners [source: Nimbyism_report.pdf]."
(housing-austin) > Perfect. /save
```

**Technical Implementation Plan:**
1.  **Implement `/edit` Command:**
    *   Add the handler to the `Orchestrator`.
    *   This will require a specialized Agent prompt designed for editing. The prompt will include the original text, the user's instruction, and must be carefully engineered to return only the modified text or a diff.
2.  **Implement Precise Citations:**
    *   Modify `KnowledgeBase.search` to return not just `file_name` but also `chunk_index` (and `document_id` UUID).
    *   Update the Agent's main system prompt to explicitly require inline citations for every claim drawn from the context.
    *   Add a post-processing step to format these citations cleanly in the final markdown output.
3.  **General Refinement:**
    *   Review all prompts for clarity and robustness.
    *   Improve error handling across all modules.
    *   Clean up the CLI output formatting.

**Demoable Outcome:** Demonstrate the `/edit` command successfully modifying a single paragraph in a long document. Generate a policy brief where every substantive claim is followed by a precise `[source_file.pdf]` citation, building ultimate confidence in the tool's output.

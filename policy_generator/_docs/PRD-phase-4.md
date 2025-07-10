# PRD: PolGen Phase 4 - Intra-Project Awareness & Agentic Reasoning

## Introduction/Overview

This document outlines the requirements for Phase 4 of the PolGen application. This phase will upgrade the core AI from a simple conversational chain to a sophisticated, multi-step "Agent" that can reason about and use the documents within a user's project.

**Problem:** The current AI can only answer questions based on the general knowledge base or the immediate conversation. It is "unaware" of the `.md` files the user has created, such as `problem_statement.md`. This prevents a truly cumulative research workflow where the AI can build upon previously generated work.

**Feature:** We will replace the standard conversational chain with a LangChain "Agent." This Agent will be given a set of "tools" that allow it to list, read, summarize, and search within the project's `.md` files. This enables the AI to answer complex, multi-step questions like, "Using my problem statement, find three relevant policy solutions from the knowledge base."

**Goal:** To create a demoable, "thinking" research assistant that can autonomously use the documents in a project as context to answer new questions, showing its reasoning process to the user in real-time.

---

## Goals

*   **Functionality:** The AI can understand and execute user requests that refer to documents within the project (e.g., "summarize my policy brief").
*   **Intelligence:** The AI can perform multi-step reasoning, such as first listing files to find the correct one, then reading it, and then using that information to perform another task.
*   **Transparency:** The user can see the agent's "chain of thought" as it decides which tools to use, building trust and providing insight into the AI's process.
*   **Robustness:** The agent is equipped with safety rails to handle ambiguity, errors, and large files gracefully without crashing or getting stuck.

---

## User Stories

*   **As a policy analyst, I want to ask the AI to summarize a document I've already written in my project** so that I can quickly get the key points without re-reading the whole thing.
*   **As a researcher, I want to tell the AI to use the context from my `problem_statement.md` file to search for solutions in the main knowledge base** so that my search is highly relevant to my defined problem.
*   **As a user, when I ask a question, I want to see the AI's thought process** so I understand how it arrived at its answer and can trust that it followed a logical path.
*   **As a user, if I make an ambiguous request like "summarize my brief," I want the AI to ask me for clarification if multiple "brief" files exist** so that it doesn't guess and perform the wrong action.

---

## Functional Requirements

### FR1: Agent Architecture
1.  The existing `ConversationalRetrievalChain` in the `Orchestrator` must be replaced with a LangChain **OpenAI Tools Agent**.
2.  This new agent will be the primary engine for handling all non-command (chat) user inputs.
3.  The `/create`, `/save`, and other command-based drafting workflows from Phase 3 must remain separate and should **not** use this new agent. The agent is for research and Q&A, not for the structured drafting process.

### FR2: Agent Tools
The Agent must be provided with a specific set of tools it can use to interact with the project and knowledge base.

1.  **`search_knowledge_base(query: str)`:** This tool performs a semantic search against the main PostgreSQL knowledge base. It should be based on the existing `KnowledgeBase.search()` functionality.
2.  **`list_project_files()`:** This tool takes no arguments. It must return a list of all `.md` filenames in the current project directory. It should use the `project_manager.list_documents()` function.
3.  **`summarize_document(filename: str)`:** This tool takes a filename as input. It must read the content of the specified file and use a dedicated summarization chain (e.g., LangChain's "Map-Reduce" or "Refine" chains) to generate a concise summary. This is crucial for handling large files without overwhelming the agent's context window.
4.  **`search_in_document(filename: str, query: str)`:** This tool takes a filename and a search query. It must load the specified document, split it into chunks in memory, and perform a semantic similarity search on those chunks to find and return the snippets most relevant to the query.

### FR3: Agent Transparency (Chain of Thought)
1.  When the agent is processing a request, its internal reasoning steps must be streamed to the user's console in real-time.
2.  The output must clearly distinguish between the agent's thoughts and its actions (tool calls).
    *   **Example Format:**
        ```
        > [Agent] Thinking: I need to find a file related to 'problem statement'. I will list the files first.
        > [Agent] Calling tool `list_project_files`...
        > [Agent] Thinking: The file `problem_statement.md` exists. Now I will summarize it.
        > [Agent] Calling tool `summarize_document` with input `problem_statement.md`...
        ```
3.  The final answer from the agent should be presented after its thought process is complete.

### FR4: Handling Ambiguity and Errors
1.  **Clarification on Ambiguity:** If the agent needs to use a file but the user's request is ambiguous (e.g., "my brief" when `policy_brief.md` and `budget_brief.md` both exist), the agent must not guess. It must respond to the user by asking for clarification.
    *   **Example Response:** "I found multiple files that could match 'my brief': `policy_brief.md` and `budget_brief.md`. Which one would you like me to use?"
2.  **Graceful Tool Errors:** If a tool call fails (e.g., agent tries to read a file that doesn't exist), the tool must return a clear error message to the agent.
3.  The agent's main system prompt must instruct it to relay these tool errors directly to the user instead of trying again.
    *   **Example Response:** "I could not complete your request because the file 'non_existent_file.md' was not found."

### FR5: Agent Safety Rails
1.  **Step Limit:** A hard limit must be imposed on the number of sequential tool calls the agent can make for a single user query. This limit should be set to **7 steps** to prevent infinite loops and control costs. If the agent exceeds this limit, it must stop and inform the user that it could not complete the request within the allowed number of steps.

---

## Non-Goals (Out of Scope for Phase 4)

*   **No Writing or Editing Tools:** The agent will only have tools to read and search for information. It will not have tools to `create`, `write_to`, or `edit` files directly. The `/create` and `/save` command workflow remains the user's method for writing.
*   **No Automatic File Selection:** The agent will not automatically "guess" which file to use without being prompted by the user's query (e.g., it won't decide on its own to read `problem_statement.md` unless the user's query mentions it).
*   **No Complex Data Analysis:** The tools will only handle text. They will not parse tables, charts, or perform quantitative analysis.

---

## Design Considerations

*   **Modular Tools:** The tool functions should be defined cleanly and separately from the agent's main orchestration logic, making them easy to test and maintain.
*   **Agent Prompting:** Significant effort will be required in "prompt engineering" the agent's main system prompt. It must clearly explain all available tools, their purposes, the requirement to ask for clarification, and the instructions for handling errors.

## Technical Considerations

*   **LangChain Agent Executor:** The implementation will center around LangChain's `AgentExecutor` class, configured with an `OpenAIToolsAgent` and the custom-built toolset.
*   **Streaming Support:** To implement the "chain of thought" feature, we will need to use the streaming capabilities of LangChain and the OpenAI API, which may require changes to how the `Orchestrator` handles and prints responses.
*   **Summarization Chains:** Implementing the `summarize_document` tool will require using specific chains from LangChain, such as `load_summarize_chain` with the `map_reduce` or `refine` type.
*   **In-Memory RAG:** The `search_in_document` tool will require implementing an in-memory RAG pipeline (load -> split -> embed -> search) for a single document.

# PolGen Phase 4: Intra-Project Awareness & Agentic Reasoning

## Overview

Phase 4 upgrades the PolGen AI from a simple conversational chain to a sophisticated, multi-step "Agent" that can reason about and use the documents within a user's project. The AI is now "aware" of the `.md` files created in the project and can autonomously interact with them.

## Key Features

### 1. **Agent Architecture**
- Replaced the `ConversationalRetrievalChain` with a LangChain **OpenAI Tools Agent**
- The agent can perform multi-step reasoning and tool usage
- Real-time streaming of the agent's "chain of thought" process

### 2. **Agent Tools**
The agent has access to four powerful tools:

- **`search_knowledge_base(query)`**: Searches the main PostgreSQL knowledge base
- **`list_project_files()`**: Lists all `.md` files in the current project
- **`summarize_document(filename)`**: Generates a concise summary of any project document
- **`search_in_document(filename, query)`**: Performs semantic search within a specific document

### 3. **Transparency & Trust**
- Users can see the agent's reasoning process in real-time
- Clear distinction between agent thoughts and actions
- Example output:
  ```
  > [Agent] Thinking: I need to find a file related to 'problem statement'. I will list the files first.
  > [Agent] Calling tool `list_project_files`...
  > [Agent] Thinking: The file `problem_statement.md` exists. Now I will summarize it.
  > [Agent] Calling tool `summarize_document` with input `problem_statement.md`...
  ```

### 4. **Safety Rails**
- **Step Limit**: Maximum of 7 tool calls per query to prevent infinite loops
- **Error Handling**: Graceful handling of tool failures with clear error messages
- **Ambiguity Resolution**: Agent asks for clarification when requests are ambiguous

## Usage Examples

### Example 1: Summarizing a Document
```
User: Can you summarize my problem statement?
Agent: [Uses list_project_files to find the file, then summarize_document to create summary]
```

### Example 2: Context-Aware Search
```
User: Using my problem statement, find three relevant policy solutions from the knowledge base
Agent: [Reads problem_statement.md, extracts key concepts, searches knowledge base with context]
```

### Example 3: Document Search
```
User: What recommendations did I make in my policy brief?
Agent: [Uses search_in_document to find specific content about recommendations]
```

## Technical Implementation

### New Files
- **`agent_tools.py`**: Defines all four tools with proper error handling and formatting

### Modified Files
- **`orchestrator.py`**: Replaced chain with agent executor, manages tool initialization
- **`main.py`**: Updated to handle streaming agent output and proper history management
- **`project_manager.py`**: Added `read_document()` function for tool usage

### Key Dependencies
- `langchain`: Core agent functionality
- `langchain-openai`: OpenAI integration
- `faiss-cpu`: In-memory vector search for document search tool

## Architecture Changes

### Before (Phase 3)
```
User Input → Orchestrator → ConversationalRetrievalChain → Response
```

### After (Phase 4)
```
User Input → Orchestrator → Agent → Tool Selection → Tool Execution → Response
                              ↑                           ↓
                              ←─── Reasoning Loop ────────←
```

## Important Notes

1. **Commands vs Agent**: The `/create`, `/save`, and other commands still bypass the agent for direct execution
2. **Drafting Mode**: When in drafting mode, the traditional LLM is used instead of the agent
3. **Project Context**: Each agent session is bound to a specific project folder
4. **No Writing Tools**: The agent can only read and search, not modify files

## Future Enhancements

While out of scope for Phase 4, potential future improvements include:
- Tools for editing existing documents
- Automatic file selection based on query context
- Complex data analysis capabilities
- Cross-project awareness 
# PolGen Phase 2: Interactive Project Sessions

## Overview

Phase 2 transforms PolGen from a single-shot Q&A tool into a stateful, interactive research assistant that supports project-based work with persistent conversation history.

## Features

- **Project Management**: Create and load distinct research projects
- **Interactive REPL**: Continuous chat interface with context retention
- **Conversation Memory**: Maintains conversation history within each session
- **Persistent Storage**: Automatically saves conversation history after each turn
- **Graceful Exit**: Handles Ctrl+C and `/exit` commands properly

## Usage

### Starting the Application

```bash
python main.py
```

### Creating a New Project

1. When prompted, type `create`
2. Enter your project name (e.g., "Housing Affordability in Austin")
3. The system will create a unique folder and start your session

### Loading an Existing Project

1. When prompted, type `load`
2. Select your project from the numbered list
3. Your session will resume (note: each session starts fresh, but history is preserved on disk)

### During a Session

- The prompt shows your current project: `(Project Name) > `
- Type your questions naturally
- The AI will search the knowledge base and respond with context
- Type `/exit` or `quit` to end the session
- Press Ctrl+C to exit gracefully

## Project Structure

```
projects/
└── housing-affordability-in-austin/
    ├── project.json              # Project metadata
    └── conversation_history.json # Saved conversation history
```

## Technical Details

### File Structure

- `main.py` - The main REPL interface
- `project_manager.py` - Handles all project file operations
- `orchestrator.py` - Manages conversations and AI interactions
- `knowledge_base.py` - Interfaces with the vector database
- `ai_core.py` - Generates AI responses

### Token Management

The system manages context windows by:
- Reserving 3000 tokens for RAG search results
- Reserving 4000 tokens for conversation history
- Trimming oldest messages when history exceeds budget
- Always prioritizing new RAG context over old conversation

### Dependencies

Install required packages:
```bash
pip install -r requirements.txt
```

Key dependencies:
- `langchain` - For AI orchestration
- `langchain-openai` - OpenAI integration
- `pgvector` - Vector database support
- `tiktoken` - Token counting
- `python-dotenv` - Environment variable management

## Environment Setup

Create a `.env` file with:
```
OPENAI_API_KEY=your_api_key_here
DATABASE_URL=postgresql://user:password@localhost/polgen_db
```

## Notes

- Each new session starts with empty conversation memory
- History is saved to disk for archival purposes
- The AI cannot see previous session history (only current session)
- No document editing features in this phase
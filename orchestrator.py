import re
from typing import List, Dict, Optional
from knowledge_base import search_global_db
from langchain_openai import ChatOpenAI
from langchain.memory import ConversationBufferMemory
from langchain.schema import HumanMessage, AIMessage
import tiktoken

# Token budget configuration
MAX_CONTEXT_TOKENS = 8000  # Total budget for the model
RAG_CONTEXT_TOKENS = 3000  # Reserved for RAG search results
HISTORY_TOKENS = 4000      # Reserved for conversation history

class Orchestrator:
    def __init__(self, project_folder: str):
        self.project_folder = project_folder
        self.memory = ConversationBufferMemory(return_messages=True)
        self.llm = ChatOpenAI(model="gpt-4", temperature=0.7)
        self.active_draft: Optional[Dict[str, str]] = None  # Will hold {"filename": str, "content": str}

    def count_tokens(self, text: str, model: str = "gpt-4") -> int:
        """Count the number of tokens in a text string."""
        encoding = tiktoken.encoding_for_model(model)
        return len(encoding.encode(text))

    def format_rag_context(self, retrieved_chunks) -> str:
        """Format retrieved chunks into a context string."""
        if not retrieved_chunks:
            return ""
        
        context_parts = []
        for i, chunk in enumerate(retrieved_chunks):
            source = chunk.metadata.get('source', 'Unknown source')
            context_parts.append(f"[Source: {source}]\n{chunk.page_content}")
        
        return "\n\n---\n\n".join(context_parts)

    def trim_conversation_history(self, messages: List, max_tokens: int) -> List:
        """
        Trim conversation history to fit within token budget.
        Keeps the most recent messages.
        """
        if not messages:
            return []
        
        # Always keep at least the last message
        if len(messages) <= 1:
            return messages
        
        # Count tokens from newest to oldest
        kept_messages = []
        total_tokens = 0
        
        for msg in reversed(messages):
            msg_tokens = self.count_tokens(msg.content)
            if total_tokens + msg_tokens > max_tokens and kept_messages:
                break
            kept_messages.insert(0, msg)
            total_tokens += msg_tokens
        
        return kept_messages

    def get_current_history(self) -> List[Dict[str, str]]:
        """
        Extracts the current conversation history from the memory.
        Returns a list of dictionaries with 'role' and 'content' keys.
        """
        messages = self.memory.chat_memory.messages
        
        history = []
        for msg in messages:
            if isinstance(msg, HumanMessage):
                history.append({"role": "user", "content": msg.content})
            elif isinstance(msg, AIMessage):
                history.append({"role": "assistant", "content": msg.content})
        
        return history

    def _handle_drafting_query(self, user_query: str) -> str:
        """Handles a query when in drafting mode, with a special prompt."""
        if not self.active_draft:
            return "Error: No active draft found."
            
        # Search the knowledge base
        retrieved_chunks = search_global_db(user_query)
        rag_context = self.format_rag_context(retrieved_chunks)
        
        # Get conversation history
        messages = self.memory.chat_memory.messages
        
        # Trim history to fit token budget
        trimmed_messages = self.trim_conversation_history(messages, HISTORY_TOKENS)
        
        # Build the prompt with drafting mode instructions
        system_prompt = f"""You are PolGen, an AI-powered policy research assistant.
You are now in drafting mode for the document '{self.active_draft['filename']}'. 
Your primary goal is to generate content for this document based on the user's instructions. 
When you are providing content that should be part of the document, you MUST wrap it in <draft_content> and </draft_content> tags. 
For conversational remarks, questions, or confirmations, do NOT use these tags."""
        
        # Construct messages for the LLM
        llm_messages = [
            {"role": "system", "content": system_prompt}
        ]
        
        # Add RAG context if available
        if rag_context:
            context_message = f"Here is relevant information from the knowledge base:\n\n{rag_context}\n\nPlease use this information to help answer the user's question."
            llm_messages.append({"role": "system", "content": context_message})
        
        # Add conversation history
        for msg in trimmed_messages:
            if isinstance(msg, HumanMessage):
                llm_messages.append({"role": "user", "content": msg.content})
            elif isinstance(msg, AIMessage):
                llm_messages.append({"role": "assistant", "content": msg.content})
        
        # Add current query
        llm_messages.append({"role": "user", "content": user_query})
        
        # Get response from LLM
        response = self.llm.invoke(llm_messages)
        raw_answer = str(response.content)
        
        # Extract content from tags
        match = re.search(r'<draft_content>(.*?)</draft_content>', raw_answer, re.DOTALL)
        if match:
            draft_content = match.group(1).strip()
            if self.active_draft['content']:
                self.active_draft['content'] += f"\n\n{draft_content}"
            else:
                self.active_draft['content'] = draft_content
            # Return the response without the tags
            clean_answer = re.sub(r'<draft_content>.*?</draft_content>', '', raw_answer, flags=re.DOTALL).strip()
            if not clean_answer:
                clean_answer = "I've added that content to your draft."
            return clean_answer
        else:
            return raw_answer

    def _handle_regular_query(self, user_query: str) -> str:
        """Handles a regular query (not in drafting mode)."""
        # Search the knowledge base
        retrieved_chunks = search_global_db(user_query)
        rag_context = self.format_rag_context(retrieved_chunks)
        
        # Get conversation history
        messages = self.memory.chat_memory.messages
        
        # Trim history to fit token budget
        trimmed_messages = self.trim_conversation_history(messages, HISTORY_TOKENS)
        
        # Build the prompt
        system_prompt = """You are PolGen, an AI-powered policy research assistant. 
You help users with policy-related questions by providing evidence-based answers from the knowledge base.
When relevant context is provided, use it to inform your answers. Always be helpful, accurate, and concise."""
        
        # Construct messages for the LLM
        llm_messages = [
            {"role": "system", "content": system_prompt}
        ]
        
        # Add RAG context if available
        if rag_context:
            context_message = f"Here is relevant information from the knowledge base:\n\n{rag_context}\n\nPlease use this information to help answer the user's question."
            llm_messages.append({"role": "system", "content": context_message})
        
        # Add conversation history
        for msg in trimmed_messages:
            if isinstance(msg, HumanMessage):
                llm_messages.append({"role": "user", "content": msg.content})
            elif isinstance(msg, AIMessage):
                llm_messages.append({"role": "assistant", "content": msg.content})
        
        # Add current query
        llm_messages.append({"role": "user", "content": user_query})
        
        # Get response from LLM
        response = self.llm.invoke(llm_messages)
        return str(response.content)

    def handle_input(self, user_input: str) -> str:
        """Main entry point to process user input (command or chat)."""
        # Check for commands
        if user_input.startswith('/'):
            response = self._handle_command(user_input)
            # Add both user command and response to history
            self.memory.chat_memory.add_user_message(user_input)
            self.memory.chat_memory.add_ai_message(response)
            return response
        
        # Handle regular chat or drafting
        if self.active_draft:
            response = self._handle_drafting_query(user_input)
        else:
            response = self._handle_regular_query(user_input)
        
        # Update memory with the new exchange
        self.memory.chat_memory.add_user_message(user_input)
        self.memory.chat_memory.add_ai_message(response)
        
        return response

    def _handle_command(self, user_input: str) -> str:
        """Parses and dispatches slash commands."""
        parts = user_input.strip().split()
        command = parts[0].lower()
        args = parts[1:] if len(parts) > 1 else []

        if command == "/create":
            return self._handle_create_command(args)
        elif command == "/save":
            return self._handle_save_command()
        elif command == "/list":
            return self._handle_list_command()
        elif command == "/help":
            return self._handle_help_command()
        else:
            return f"Unknown command: '{command}'. Type /help for a list of commands."

    def _handle_create_command(self, args: List[str]) -> str:
        from project_manager import document_exists
        
        if not args:
            return "Usage: /create <filename.md>"
        
        filename = args[0]
        if not filename.endswith('.md'):
            return "Error: Filename must end with .md"
        
        if document_exists(self.project_folder, filename):
            return f"Error: '{filename}' already exists. Please choose a different name."
        
        if self.active_draft:
            # Note: In the real implementation, this should be handled in main.py
            # to properly get user input. For now, we'll return a message
            return "Error: You have an unsaved draft. Please save it with /save or start a new session."

        self.active_draft = {"filename": filename, "content": ""}
        return f"OK, let's draft `{filename}`. How should we begin?"

    def _handle_save_command(self) -> str:
        from project_manager import save_document
        
        if not self.active_draft:
            return "No active draft to save. Use /create <filename.md> to start one."
        
        filename = self.active_draft['filename']
        content = self.active_draft['content'].strip()
        
        if not content:
            return "Cannot save an empty document. Please add some content first."
        
        save_document(self.project_folder, filename, content)
        
        self.active_draft = None  # Clear the draft
        return f"Successfully saved `{filename}`."

    def _handle_list_command(self) -> str:
        from project_manager import list_documents
        
        docs = list_documents(self.project_folder)
        if not docs:
            return "No documents found in this project."
        
        response = "Documents in this project:\n"
        response += "\n".join([f"- {doc}" for doc in docs])
        return response

    def _handle_help_command(self) -> str:
        return """Available Commands:
/create <filename.md>  - Start a new document draft
/save                  - Save the current active draft to a file
/list                  - List all .md documents in the project
/help                  - Show this help message
/exit or quit          - Exit the application"""

    def has_unsaved_draft(self) -> bool:
        """Check if there's an active draft with content."""
        return self.active_draft is not None and bool(self.active_draft.get('content', '').strip())
from typing import List, Dict
from knowledge_base import search_global_db
from langchain_openai import ChatOpenAI
from langchain.memory import ConversationBufferMemory
from langchain.schema import HumanMessage, AIMessage
import tiktoken

# Token budget configuration
MAX_CONTEXT_TOKENS = 8000  # Total budget for the model
RAG_CONTEXT_TOKENS = 3000  # Reserved for RAG search results
HISTORY_TOKENS = 4000      # Reserved for conversation history

# Cache for conversation memories per project
_memory_cache = {}

def count_tokens(text: str, model: str = "gpt-4") -> int:
    """Count the number of tokens in a text string."""
    encoding = tiktoken.encoding_for_model(model)
    return len(encoding.encode(text))

def get_conversation_memory(project_folder: str) -> ConversationBufferMemory:
    """
    Retrieves or creates a conversation memory for a given project session.
    """
    if project_folder not in _memory_cache:
        memory = ConversationBufferMemory(return_messages=True)
        _memory_cache[project_folder] = memory
    return _memory_cache[project_folder]

def format_rag_context(retrieved_chunks) -> str:
    """Format retrieved chunks into a context string."""
    if not retrieved_chunks:
        return ""
    
    context_parts = []
    for i, chunk in enumerate(retrieved_chunks):
        source = chunk.metadata.get('source', 'Unknown source')
        context_parts.append(f"[Source: {source}]\n{chunk.page_content}")
    
    return "\n\n---\n\n".join(context_parts)

def trim_conversation_history(messages: List, max_tokens: int) -> List:
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
        msg_tokens = count_tokens(msg.content)
        if total_tokens + msg_tokens > max_tokens and kept_messages:
            break
        kept_messages.insert(0, msg)
        total_tokens += msg_tokens
    
    return kept_messages

def handle_query(project_folder: str, user_query: str) -> str:
    """
    Handles a single user query, gets a response from the AI, and returns it.
    The conversation history is automatically maintained.
    """
    # Get the conversation memory for this project
    memory = get_conversation_memory(project_folder)
    
    # Search the knowledge base
    retrieved_chunks = search_global_db(user_query)
    rag_context = format_rag_context(retrieved_chunks)
    
    # Get conversation history
    messages = memory.chat_memory.messages
    
    # Trim history to fit token budget
    trimmed_messages = trim_conversation_history(messages, HISTORY_TOKENS)
    
    # Initialize the LLM
    llm = ChatOpenAI(model="gpt-4", temperature=0.7)
    
    # Build the prompt
    system_prompt = """You are PolGen, an AI-powered policy research assistant. 
You help users with policy-related questions by providing evidence-based answers from the knowledge base.
When relevant context is provided, use it to inform your answers. Always be helpful, accurate, and concise."""
    
    # Construct messages for the LLM
    llm_messages = [{"role": "system", "content": system_prompt}]
    
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
    response = llm.invoke(llm_messages)
    answer = response.content
    
    # Update memory with the new exchange
    memory.chat_memory.add_user_message(user_query)
    memory.chat_memory.add_ai_message(answer)
    
    return answer

def get_current_history(project_folder: str) -> List[Dict[str, str]]:
    """
    Extracts the current conversation history from the memory.
    Returns a list of dictionaries with 'role' and 'content' keys.
    """
    memory = get_conversation_memory(project_folder)
    messages = memory.chat_memory.messages
    
    history = []
    for msg in messages:
        if isinstance(msg, HumanMessage):
            history.append({"role": "user", "content": msg.content})
        elif isinstance(msg, AIMessage):
            history.append({"role": "assistant", "content": msg.content})
    
    return history
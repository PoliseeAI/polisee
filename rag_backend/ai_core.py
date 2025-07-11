# ai_core.py
# Main brain for the policy generation tool - takes a user query and searches our document database with RAG to construct an answer.

from typing import List, Optional
from langchain_core.documents import Document
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI

# Define the precise prompt template as required by the PRD
PROMPT_TEMPLATE = (
    "System: You are an AI policy research assistant. Your task is to answer the user's question based *only* on the provided context. "
    "If the context does not contain the answer, state that you could not find the information in the knowledge base.\n\n"
    "Human:\n"
    "Here is the context retrieved from the knowledge base:\n"
    "---\n"
    "{context}\n"
    "---\n"
    "Based on the context above, please answer the following question:\n"
    "{question}"
)

def generate_response(question: str, context_docs: List[Document], conversation_history: Optional[List[dict]] = None) -> str:
    """
    Generates a response using an LLM based on the user's question and retrieved context.
    
    Args:
        question: The user's question.
        context_docs: A list of documents retrieved from the knowledge base.
        conversation_history: Optional conversation history for Phase 2 interactive sessions.
    
    Returns:
        The AI-generated answer as a string.
    """
    print("> Generating response...")
    
    # Format the retrieved document chunks into a single string
    context_text = "\n\n---\n\n".join([doc.page_content for doc in context_docs])

    # Initialize the ChatOpenAI model
    model = ChatOpenAI(model="gpt-4-turbo")
    
    # For Phase 1 compatibility (single-shot Q&A)
    if conversation_history is None:
        # Create the prompt using the template
        prompt_template = ChatPromptTemplate.from_template(PROMPT_TEMPLATE)
        prompt = prompt_template.format(question=question, context=context_text)
        
        # Invoke the model and get the response
        response = model.invoke(prompt)
    else:
        # For Phase 2 (interactive sessions with memory)
        # Build messages list with system prompt, history, and current question
        messages = [
            {
                "role": "system", 
                "content": "You are an AI policy research assistant. Your task is to answer the user's question based *only* on the provided context. "
                          "If the context does not contain the answer, state that you could not find the information in the knowledge base."
            }
        ]
        
        # Add conversation history
        messages.extend(conversation_history)
        
        # Add current question with context
        user_message = (
            f"Here is the context retrieved from the knowledge base:\n"
            f"---\n"
            f"{context_text}\n"
            f"---\n"
            f"Based on the context above, please answer the following question:\n"
            f"{question}"
        )
        messages.append({"role": "user", "content": user_message})
        
        # Invoke the model with full message history
        response = model.invoke(messages)
    
    return response.content

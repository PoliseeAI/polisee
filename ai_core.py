# ai_core.py

from typing import List
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

def generate_response(question: str, context_docs: List[Document]) -> str:
    """
    Generates a response using an LLM based on the user's question and retrieved context.
    
    Args:
        question: The user's question.
        context_docs: A list of documents retrieved from the knowledge base.
    
    Returns:
        The AI-generated answer as a string.
    """
    print("> Generating response...")
    
    # Format the retrieved document chunks into a single string
    context_text = "\n\n---\n\n".join([doc.page_content for doc in context_docs])

    # Create the prompt using the template
    prompt_template = ChatPromptTemplate.from_template(PROMPT_TEMPLATE)
    prompt = prompt_template.format(question=question, context=context_text)

    # Initialize the ChatOpenAI model
    model = ChatOpenAI(model="gpt-4-turbo")
    
    # Invoke the model and get the response
    response = model.invoke(prompt)
    
    return response.content
import os
from langchain.tools import tool
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain.chains.summarize import load_summarize_chain
from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document

import project_manager as pm
from knowledge_base import search_global_db

# Global variable to store the current project folder
_current_project_folder = None

def set_project_folder(folder):
    """Set the current project folder for all tools to use."""
    global _current_project_folder
    _current_project_folder = folder

# --- Tool 1: Search the main Knowledge Base ---
@tool
def search_knowledge_base(query: str) -> str:
    """
    Searches the main PostgreSQL knowledge base for information on a given query.
    Returns relevant document chunks formatted as text.
    """
    print(f"[Tool Call] Searching knowledge base for: '{query}'")
    results = search_global_db(query)
    # Format results as a string for the agent
    formatted_results = []
    for doc in results:
        formatted_results.append(f"Content: {doc.page_content}\nSource: {doc.metadata.get('source', 'Unknown')}")
    return "\n---\n".join(formatted_results) if formatted_results else "No relevant results found."

# --- Tool 2: List Project Files ---
@tool
def list_project_files() -> str:
    """
    Lists all markdown (.md) documents in the current project folder.
    Returns a comma-separated list of filenames.
    """
    if not _current_project_folder:
        return "Error: No project folder is currently set."
    
    print(f"[Tool Call] Listing files in project: '{_current_project_folder}'")
    files = pm.list_documents(_current_project_folder)
    if not files:
        return "No markdown files found in the current project."
    return ", ".join(files)

# --- Tool 3: Summarize a Document ---
@tool
def summarize_document(filename: str) -> str:
    """
    Reads a document from the project folder and returns a concise summary.
    Use this for large documents to understand their contents without reading the whole file.
    Args:
        filename: The name of the markdown file to summarize (e.g., 'policy_brief.md')
    """
    if not _current_project_folder:
        return "Error: No project folder is currently set."
        
    print(f"[Tool Call] Summarizing document: '{filename}'")
    try:
        # We need a function in project_manager to read a file's content
        content = pm.read_document(_current_project_folder, filename)
        if not content:
            return "Error: Document is empty or could not be read."

        docs = [Document(page_content=content)]
        llm = ChatOpenAI(temperature=0, model="gpt-4-turbo")
        
        # Use LangChain's summarization chain
        chain = load_summarize_chain(llm, chain_type="refine")
        summary = chain.invoke({"input_documents": docs})
        return summary['output_text']

    except FileNotFoundError:
        return f"Error: File '{filename}' not found."
    except Exception as e:
        return f"An error occurred during summarization: {e}"

# --- Tool 4: Search within a Single Document ---
@tool
def search_in_document(filename: str, query: str) -> str:
    """
    Performs a semantic search for a query within a single specified document.
    Use this to find specific information inside a file.
    Args:
        filename: The name of the markdown file to search in (e.g., 'problem_statement.md')
        query: What to search for within the document
    """
    if not _current_project_folder:
        return "Error: No project folder is currently set."
        
    print(f"[Tool Call] Searching in '{filename}' for: '{query}'")
    try:
        content = pm.read_document(_current_project_folder, filename)
        if not content:
            return "Error: Document is empty or could not be read."

        # In-memory RAG for the single document
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
        split_docs = text_splitter.create_documents([content])
        
        embeddings = OpenAIEmbeddings()
        vector_store = FAISS.from_documents(split_docs, embeddings)
        
        retriever = vector_store.as_retriever(search_kwargs={'k': 3})
        results = retriever.invoke(query)
        
        # Format results into a single string
        return "\n---\n".join([doc.page_content for doc in results])

    except FileNotFoundError:
        return f"Error: File '{filename}' not found."
    except Exception as e:
        return f"An error occurred during search: {e}"

def get_all_tools():
    """Returns a list of all defined tools for the agent."""
    return [
        search_knowledge_base,
        list_project_files,
        summarize_document,
        search_in_document
    ] 
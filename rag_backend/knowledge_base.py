# knowledge_base.py
# API for making RAG queries to the document embedding DB.

from typing import List
from langchain_community.vectorstores.pgvector import PGVector
from langchain_core.documents import Document
from langchain_openai import OpenAIEmbeddings

import config

def get_retriever():
    """Initializes and returns a PGVector retriever."""
    # Use OpenAI's embedding model, which must match the one used in ingestion
    embeddings = OpenAIEmbeddings(model=config.EMBEDDING_MODEL)

    # Initialize the PGVector store
    store = PGVector(
        collection_name=config.COLLECTION_NAME,
        connection_string=config.DATABASE_URL,
        embedding_function=embeddings,
    )

    # Return the store as a retriever, configured to fetch the top 5 results
    return store.as_retriever(search_kwargs={"k": 5})

def search_global_db(query: str) -> List[Document]:
    """
    Searches the global knowledge base for chunks relevant to the query.
    
    Args:
        query: The user's question.
    
    Returns:
        A list of LangChain Document objects, including metadata.
    """
    print("> Searching knowledge base...")
    retriever = get_retriever()
    print(query)
    # The invoke method performs the similarity search
    return retriever.invoke(query)

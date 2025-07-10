# knowledge_base.py

import os
from typing import List
from langchain_community.vectorstores.pgvector import PGVector
from langchain_core.documents import Document
from langchain_openai import OpenAIEmbeddings

# Define the collection name that will be used in the database
COLLECTION_NAME = "polgen_documents"

def get_retriever():
    """Initializes and returns a PGVector retriever."""
    # Load database connection string from environment variables
    CONNECTION_STRING = os.getenv("DATABASE_URL")
    if not CONNECTION_STRING:
        raise ValueError("DATABASE_URL environment variable not set.")

    # Use OpenAI's embedding model, which must match the one used in ingestion
    embeddings = OpenAIEmbeddings(model="text-embedding-3-small")

    # Initialize the PGVector store
    store = PGVector(
        collection_name=COLLECTION_NAME,
        connection_string=CONNECTION_STRING,
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
    # The invoke method performs the similarity search
    return retriever.invoke(query)
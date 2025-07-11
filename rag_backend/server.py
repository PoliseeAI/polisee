# server.py
# FastAPI server that provides an HTTP wrapper for our two RAG endpoints.
# Exposes two endpoints /search_bills and /ask
import os
from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from dotenv import load_dotenv
from typing import List, Optional

# --- New Imports ---
# Import the core functions from your knowledge base and AI modules
from knowledge_base import search_global_db
from ai_core import generate_response
from langchain_core.documents import Document

# Load environment variables
load_dotenv()

# Get API key from environment
API_KEY = os.getenv("API_KEY")
if not API_KEY:
    raise ValueError("API_KEY environment variable not set")

# Initialize FastAPI app
app = FastAPI(title="PolGen API", version="1.0.0")

# Security scheme
security = HTTPBearer()

# --- Original Models for /search_bills ---
class PersonaRequest(BaseModel):
    query: str

class BillSummary(BaseModel):
    summary_point: str
    bill_id: int
    relevance_score: int

# --- New Models for /ask endpoint ---
class KnowledgeBaseRequest(BaseModel):
    """Request model for asking a question to the knowledge base."""
    question: str
    # Optional flag to mirror the CLI's --verbose mode
    include_sources: bool = False

class SourceDocument(BaseModel):
    """Response model for a single retrieved source document."""
    source: str
    content: str

class KnowledgeBaseResponse(BaseModel):
    """Response model for the answer from the knowledge base."""
    answer: str
    sources: Optional[List[SourceDocument]] = None


# --- Authentication Dependency ---
async def verify_api_key(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if credentials.credentials != API_KEY:
        raise HTTPException(
            status_code=401,
            detail="Invalid API key",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return credentials.credentials

# --- New Endpoint: /ask ---
@app.post("/ask", response_model=KnowledgeBaseResponse)
async def ask_knowledge_base(
    request: KnowledgeBaseRequest,
    _api_key: str = Depends(verify_api_key)
):
    """
    Ask a question and get an evidence-based answer from the knowledge base.
    This endpoint mirrors the functionality of the 'ask' CLI command.
    """
    try:
        # 1. Search the knowledge base using the imported function
        retrieved_chunks: List[Document] = search_global_db(request.question)

        # 2. Handle the case where no relevant chunks are found
        if not retrieved_chunks:
            raise HTTPException(
                status_code=404,
                detail="Could not find any information related to your question in the knowledge base."
            )

        # 3. Generate the final response using the imported function
        answer = generate_response(request.question, retrieved_chunks)

        # 4. Prepare the response object
        response = KnowledgeBaseResponse(answer=answer)
        
        # 5. If requested, include the source chunks in the response
        if request.include_sources:
            response.sources = [
                SourceDocument(
                    source=chunk.metadata.get('source', 'Unknown source'),
                    content=chunk.page_content
                ) for chunk in retrieved_chunks
            ]

        return response

    except Exception as e:
        # Catch-all for other potential errors during processing
        raise HTTPException(status_code=500, detail=f"Error processing query: {str(e)}")


# --- Original Endpoint: /search_bills ---
@app.post("/search_bills", response_model=list[BillSummary])
async def search_bills(
    request: PersonaRequest,
    _api_key: str = Depends(verify_api_key)
):
    """
    Search bills based on a user persona or a generic policy query.
    Requires Bearer token authentication with API_KEY from environment.
    """
    try:
        # Call the new intelligent search function
        from query_engine import intelligent_bill_search
        results = intelligent_bill_search(request.query)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing query: {str(e)}")


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

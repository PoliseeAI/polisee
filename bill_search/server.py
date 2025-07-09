import os
from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from dotenv import load_dotenv
from query_engine import answer_persona_query

# Load environment variables
load_dotenv()

# Get API key from environment
API_KEY = os.getenv("API_KEY")
if not API_KEY:
    raise ValueError("API_KEY environment variable not set")

# Initialize FastAPI app
app = FastAPI(title="Bill Search API", version="1.0.0")

# Security scheme
security = HTTPBearer()

# Request model
class PersonaRequest(BaseModel):
    persona: str

# Response model
class BillSummary(BaseModel):
    summary_point: str
    bill_id: int

# Authentication dependency
async def verify_api_key(credentials: HTTPAuthorizationCredentials = Depends(security)):
    print(credentials.credentials)
    if credentials.credentials != API_KEY:
        raise HTTPException(
            status_code=401,
            detail="Invalid API key",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return credentials.credentials

@app.post("/search_bills", response_model=list[BillSummary])
async def search_bills(
    request: PersonaRequest,
    _api_key: str = Depends(verify_api_key)
):

    """
    Search bills based on a user persona.

    Requires Bearer token authentication with API_KEY from environment.
    """
    try:
        # Call the query engine
        results = answer_persona_query(request.persona)

        # The query engine returns a list of dicts with 'summary_point' and 'bill_id'
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

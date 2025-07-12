Backend for the RAG endpoints.

This backend is hosted on Fly.io, separately from the Next.js frontent (hosted on Vercel.)

To use, save config in `rag_backend/.env`:

```
SUPABASE_DB_URL=<url>
OPENAI_API_KEY=<key>
API_KEY=<key>
```

You can set the `API_KEY` to whatever you like when testing locally. Your local requests must include this API key in their `Authorization` header (see below).

To start the local HTTP server:

```bash
cd rag_backend
source venv
pip install -r requirements.txt
python server.py
```

Then test the two endpoints:

```bash
curl -X POST http://localhost:8000/search_bills \
  -H "Authorization: Bearer <api_key>" \
  -H "Content-Type: application/json" \
  -d '{"query": "I am a farmer in the Midwest concerned about water rights"}'

curl -X 'POST' \                                       
  'http://localhost:8000/ask' \                          
  -H 'accept: application/json' \      
  -H 'Content-Type: application/json' \                                        
  -H 'Authorization: Bearer <api_key>' \
  -d '{
  "question": "how do federal taxes work",
  "include_sources": true
}'
```

To deploy changes to Fly:

```bash
cd rag_backend
flyctl deploy
```

To query against the production server, ask a Poliesee team member for the production `API_KEY`. Then run the above queries replacing `http://localhost:8000` to `https://bill-search.fly.dev/ask` (note the upgrade from `http` to `https`), using the correct API key.

For more information, see documentation within the invididual Python files in this dir. See also `rag_backend/policy_generator/README.md`.

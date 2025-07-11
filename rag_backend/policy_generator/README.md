# PolGen CLI - Interactive Policy Generation Tool

A command-line interface tool that guides users through the initial phases of creating public policy documents using AI assistance.

This was the proof of concept for the 'policy generator tool'. I (George) built the CLI as an interface to test the policy generator before we finalised it and added it to the web frontend.

The CLI doesn't work anymore because the core logic has been moved into the parent dir (`rag_backend/ai_core.py` and `rag_backend/knowledge_base.py`), but I'm leaving the PRDs and old code in the repo just to show my work.

See also `rag_backend/ingest.py` which we used to generate embeddings for the documents.

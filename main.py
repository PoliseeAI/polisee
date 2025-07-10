# main.py

import os
from typing import List, Optional
import typer
from dotenv import load_dotenv

# Import functions from our other modules
from knowledge_base import search_global_db
from ai_core import generate_response

# Create a Typer application instance
app = typer.Typer()

@app.command()
def main(
    # Typer uses function arguments to define CLI arguments.
    # The 'Optional[List[str]]' allows us to capture all arguments.
    question_parts: Optional[List[str]] = typer.Argument(
        None, help="The question you want to ask PolGen."
    ),
    # The '--verbose' flag is defined here as a boolean option.
    verbose: bool = typer.Option(
        False, "--verbose", "-v", help="Enable verbose mode to show retrieved chunks."
    )
):
    """
    PolGen: An AI-powered policy research assistant.
    
    Ask a question and get an evidence-based answer from your knowledge base.
    """
    # Check if a question was provided
    if not question_parts:
        print("Usage: python main.py \"Your question here\"")
        raise typer.Exit()

    # Join all parts of the question into a single string
    question = " ".join(question_parts)
    print(f"Question: {question}")
    print("> Searching knowledge base and generating response...")
    
    # 1. Search the knowledge base
    retrieved_chunks = search_global_db(question)

    # 2. Handle the case where no relevant chunks are found
    if not retrieved_chunks:
        print("\nI could not find any information related to your question in the knowledge base.")
        raise typer.Exit()

    # 3. If verbose mode is enabled, print the retrieved chunks
    if verbose:
        print("\n--- Retrieved Chunks (Verbose Mode) ---")
        for i, chunk in enumerate(retrieved_chunks):
            # We access the source file metadata here
            source_file = chunk.metadata.get('source', 'Unknown source')
            print(f"\n[Chunk {i+1} from: {source_file}]")
            print(chunk.page_content)
        print("\n-------------------------------------\n")

    # 4. Generate the final response
    answer = generate_response(question, retrieved_chunks)

    # 5. Print the final answer
    print("\n--- Answer ---")
    print(answer)


if __name__ == "__main__":
    # Load environment variables from the .env file
    load_dotenv()
    # Run the Typer application
    app()
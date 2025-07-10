# main.py

import sys
import os
from typing import List, Optional
import typer
from dotenv import load_dotenv

# Import functions from our modules
from knowledge_base import search_global_db
from ai_core import generate_response
import project_manager as pm
import orchestrator as orch

# Create a Typer application instance
app = typer.Typer()

def run_chat_session(project_folder):
    """Main REPL loop for an active project session."""
    project_details = pm.load_project_details(project_folder)
    project_name = project_details.get("name", project_folder)
    
    print(f"\n--- Starting session for project: '{project_name}' ---")
    print("Type '/exit' or 'quit' to end the session.")

    while True:
        try:
            prompt = f"({project_name}) > "
            user_input = input(prompt)

            if user_input.lower() in ["/exit", "quit"]:
                raise KeyboardInterrupt  # Use the same exit logic

            # Handle the query
            print("> Searching knowledge base and generating response...")
            response = orch.handle_query(project_folder, user_input)
            print(f"\n{response}\n")
            
            # Save history after every successful turn
            history = orch.get_current_history(project_folder)
            pm.save_conversation_history(project_folder, history)

        except KeyboardInterrupt:
            print("\nExiting session. Goodbye!")
            # Save history one final time before exiting
            history = orch.get_current_history(project_folder)
            pm.save_conversation_history(project_folder, history)
            sys.exit(0)
        except Exception as e:
            print(f"\nAn error occurred: {e}")
            # Continue the loop on error

def project_selection_menu():
    """Handles the initial menu for creating or loading a project."""
    while True:
        choice = input("Load existing project or create new one? [load/create]: ").lower().strip()
        if choice == "create":
            project_name = input("Enter new project name: ").strip()
            if project_name:
                # Create the project and get the path
                project_path = pm.create_project(project_name)
                # Extract just the folder name from the full path
                project_folder = os.path.basename(project_path)
                run_chat_session(project_folder)
                break
            else:
                print("Project name cannot be empty.")
        elif choice == "load":
            projects = pm.list_projects()
            if not projects:
                print("No projects found. Please create one first.")
                continue
            
            print("\nAvailable projects:")
            for i, p in enumerate(projects):
                # Load project details to show the actual name
                details = pm.load_project_details(p)
                project_name = details.get("name", p)
                print(f"  {i+1}. {project_name} (folder: {p})")
            
            try:
                selection = int(input("Select a project by number: ").strip())
                if 1 <= selection <= len(projects):
                    project_folder = projects[selection-1]
                    run_chat_session(project_folder)
                    break
                else:
                    print("Invalid selection.")
            except ValueError:
                print("Please enter a valid number.")
        else:
            print("Invalid command. Please type 'load' or 'create'.")

@app.command()
def interactive():
    """
    Launch the interactive project-based research assistant (Phase 2).
    """
    # Ensure projects directory exists
    pm.ensure_projects_dir_exists()
    
    # Start the application
    print("=== PolGen Interactive Research Assistant ===")
    print("Phase 2: Project-based Conversational Interface\n")
    
    project_selection_menu()

@app.command()
def ask(
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
    PolGen Phase 1: Single-shot Q&A mode.
    
    Ask a question and get an evidence-based answer from your knowledge base.
    """
    # Check if a question was provided
    if not question_parts:
        print("Usage: python main.py ask \"Your question here\"")
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

    # 4. Generate the final response (Phase 1 mode - no conversation history)
    answer = generate_response(question, retrieved_chunks)

    # 5. Print the final answer
    print("\n--- Answer ---")
    print(answer)

@app.callback(invoke_without_command=True)
def main(ctx: typer.Context):
    """
    PolGen: An AI-powered policy research assistant.
    
    Use 'ask' for single-shot Q&A or 'interactive' for project-based sessions.
    """
    # If no command is provided, show help
    if ctx.invoked_subcommand is None:
        print("Usage: python main.py [COMMAND] [OPTIONS]")
        print("\nCommands:")
        print("  ask          Single-shot Q&A mode (Phase 1)")
        print("  interactive  Interactive project-based mode (Phase 2)")
        print("\nFor more help: python main.py --help")
        raise typer.Exit()

if __name__ == "__main__":
    # Load environment variables from the .env file
    load_dotenv()
    # Run the Typer application
    app()

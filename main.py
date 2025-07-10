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
from orchestrator import Orchestrator
from langchain_core.messages import HumanMessage, AIMessage

# Create a Typer application instance
app = typer.Typer()

def run_chat_session(project_folder):
    """Main REPL loop for an active project session, with corrected history management."""
    orchestrator = Orchestrator(project_folder)
    project_details = pm.load_project_details(project_folder)
    project_name = project_details.get("name", project_folder)
    
    # History is a list of LangChain Message objects
    chat_history = []

    print(f"\n--- Starting session for project: '{project_name}' ---")
    print("Type /help for a list of commands.")

    while True:
        try:
            prompt = f"({project_name}) > "
            user_input = input(prompt).strip()
            
            if user_input.lower() in ["/exit", "quit"]:
                # Check for unsaved draft before exiting
                if orchestrator.has_unsaved_draft():
                    confirm = input("You have unsaved changes. Are you sure you want to exit? [y/n]: ").lower()
                    if confirm != 'y':
                        continue  # Go back to the loop
                raise KeyboardInterrupt

            if not user_input:
                continue
            
            # Special handling for /create command with unsaved draft
            if user_input.startswith("/create") and orchestrator.has_unsaved_draft():
                confirm = input("You have an unsaved draft. Do you want to discard it and start a new one? [y/n]: ").lower()
                if confirm != 'y':
                    print("Create command cancelled.")
                    continue
            
            # Add user message to history
            chat_history.append(HumanMessage(content=user_input))

            # Handle input and get response
            response_generator = orchestrator.handle_input(user_input, chat_history)
            
            if isinstance(response_generator, str):
                # It's a command response or drafting response
                final_response = response_generator
                print(f"\n> {final_response}\n")
            else: 
                # Streaming agent output
                final_response = ""
                print("\n", flush=True)
                # The verbose=True in AgentExecutor prints the thoughts. We just capture the final output here.
                for chunk in response_generator:
                    if "output" in chunk:
                        # This is the final answer chunk
                        final_response += chunk["output"]
                
                # Print the final response after streaming is complete
                if final_response:
                    print(f"> {final_response}\n")
            
            # Add AI response to history
            chat_history.append(AIMessage(content=final_response))

            # Save history to file
            history_dicts = [{"role": "user" if isinstance(m, HumanMessage) else "assistant", "content": m.content} for m in chat_history]
            pm.save_conversation_history(project_folder, history_dicts)

        except KeyboardInterrupt:
            print("\nExiting session. Goodbye!")
            # Save history one final time before exiting
            history_dicts = [{"role": "user" if isinstance(m, HumanMessage) else "assistant", "content": m.content} for m in chat_history]
            pm.save_conversation_history(project_folder, history_dicts)
            sys.exit(0)
        except Exception as e:
            print(f"\nAn error occurred: {e}\n")
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

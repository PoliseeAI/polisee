import questionary
from rich.console import Console
from rich.markdown import Markdown
from pathlib import Path
import time
from dotenv import load_dotenv

import engine
import prompts

# --- INITIAL SETUP ---
load_dotenv()
console = Console()


def main():
    """Main function to run the interactive CLI tool."""

    # --- WELCOME AND PROJECT SETUP ---
    console.print(Markdown("# Welcome to the PolGen Policy Co-Pilot!"))
    policy_topic = questionary.text(
        "What policy do you want to develop today?",
        default="AI Safety and Regulation"
    ).ask()

    if not policy_topic:
        console.print("[bold red]Policy topic cannot be empty. Exiting.[/bold red]")
        return

    # Sanitize topic to create a valid directory name
    dir_name = "policy_" + "".join(c if c.isalnum() else "_" for c in policy_topic.lower())
    project_path = Path(dir_name)
    project_path.mkdir(exist_ok=True)
    
    console.print(f"\n[green]Great! A new project folder has been created at:[/green] [bold cyan]{project_path.resolve()}[/bold cyan]")

    # --- PHASE 1: PROBLEM DEFINITION ---
    console.print(Markdown("\n## --- PHASE 1: SCOPING THE POLICY ---"))
    geography = questionary.select(
        "Please specify the geography for this policy:",
        choices=["National (US)", "State / Provincial", "International", "Local"]
    ).ask()

    success_metric = questionary.text(
        "What is the primary success metric for this policy?",
        default="Establish a clear regulatory framework for high-risk AI models within 2 years."
    ).ask()

    # --- PHASE 2: EVIDENCE GATHERING ---
    console.print(Markdown("\n## --- PHASE 2: GATHERING & ANALYZING EVIDENCE ---"))
    with console.status("[bold yellow]Analyzing curated data sources...[/bold yellow]", spinner="dots"):
        retriever = engine.load_and_process_documents()
        time.sleep(2) # Simulate work
    console.print("[green]✓ Analysis of curated data complete.[/green]")

    # --- GENERATE SUMMARIES ---
    summary_topic = "Key technical frameworks, risks, and stakeholder positions on AI safety."
    with console.status("[bold yellow]Generating technical summary...[/bold yellow]", spinner="dots"):
        summary_text = engine.run_summary_chain(retriever, prompts.SUMMARY_PROMPT_TEMPLATE, summary_topic)
        time.sleep(1)
    
    summary_file = project_path / "1_Technical_Summary.md"
    summary_file.write_text(summary_text)
    console.print(f"[green]✓ Technical summary saved to:[/green] [bold cyan]{summary_file.name}[/bold cyan]")
    
    # --- DISPLAY SUMMARY ---
    display_summary = questionary.confirm("Would you like to display the summary here?").ask()
    if display_summary:
        console.print(Markdown("---"))
        console.print(Markdown(summary_text))
        console.print(Markdown("---"))

    # --- PHASE 3 & 4: DRAFTING ---
    console.print(Markdown("\n## --- PHASE 3: DRAFTING THE POLICY BRIEF ---"))
    proceed_to_draft = questionary.confirm(
        "Ready to draft an initial policy brief based on this summary?"
    ).ask()

    if proceed_to_draft:
        with console.status("[bold yellow]Drafting policy brief... This may take a moment.[/bold yellow]", spinner="dots"):
            draft_text = engine.run_drafting_chain(summary_text, prompts.DRAFTING_PROMPT_TEMPLATE)
        
        draft_file = project_path / "2_Policy_Brief_Draft_v1.md"
        draft_file.write_text(draft_text)
        console.print(f"[green]✓ Policy brief draft saved to:[/green] [bold cyan]{draft_file.name}[/bold cyan]")
    
    console.print(Markdown("\n[bold green]✨ All tasks complete! Your project files are ready for review. ✨[/bold green]"))


if __name__ == "__main__":
    main() 
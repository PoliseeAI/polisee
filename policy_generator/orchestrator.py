import re
from typing import List, Dict, Optional
from langchain_openai import ChatOpenAI
from langchain.prompts import MessagesPlaceholder
from langchain_core.prompts import ChatPromptTemplate
from langchain.agents import AgentExecutor, create_openai_tools_agent
from langchain_core.messages import HumanMessage, AIMessage

# Import the new tools module
import agent_tools

class Orchestrator:
    def __init__(self, project_folder):
        self.project_folder = project_folder
        # Set the project folder for all tools
        agent_tools.set_project_folder(project_folder)
        # We now initialize an agent, not a chain
        self.agent_executor = self._initialize_agent()
        self.active_draft: Optional[Dict[str, str]] = None

    def _initialize_agent(self):
        """Initializes the OpenAI Tools Agent and its executor."""
        llm = ChatOpenAI(temperature=0, model="gpt-4-turbo", streaming=True)
        
        # Get the tool list from our new module
        tools = agent_tools.get_all_tools()
        
        # Create the agent's prompt
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are PolGen, an AI-powered policy research assistant.
You have access to a set of tools to help you answer questions.
When a user mentions a file in their project, you should use your tools to interact with it.
If a user's request is ambiguous (e.g., they say 'my brief' and multiple brief files exist), you MUST ask for clarification.
If a tool returns an error, inform the user about the error and stop.
Do not make up file names. Use the `list_project_files` tool to see which files are available.
When using tools, think step by step about what you need to do."""),
            MessagesPlaceholder(variable_name="chat_history"),
            ("user", "{input}"),
            MessagesPlaceholder(variable_name="agent_scratchpad"),
        ])
        
        agent = create_openai_tools_agent(llm, tools, prompt)
        
        # The AgentExecutor runs the agent and its tools
        # max_iterations is the safety rail
        agent_executor = AgentExecutor(
            agent=agent, 
            tools=tools, 
            verbose=True, # This will print the chain of thought
            max_iterations=7, # Step limit
            handle_parsing_errors=True # Gracefully handle errors
        )
        return agent_executor

    def get_current_history_for_saving(self):
        """Returns the current history in a format suitable for saving."""
        # This will be managed by main.py now
        return []

    def handle_input(self, user_input, chat_history):
        """Main entry point to process user input. Now takes history as an argument."""
        # Commands are still handled separately and don't use the agent.
        if user_input.startswith('/'):
            # This part remains mostly the same
            return self._handle_command(user_input)

        # If in drafting mode, use the old drafting logic.
        if self.active_draft:
            return self._handle_drafting_query(user_input)

        # If it's a regular chat message, invoke the agent
        response_generator = self.agent_executor.stream({
            "input": user_input,
            "chat_history": chat_history
        })
        
        return response_generator

    def _handle_drafting_query(self, user_query):
        """Handles a query when in drafting mode. Needs its own LLM instance."""
        if not self.active_draft:
            return "Error: No active draft found."
            
        llm = ChatOpenAI(temperature=0, model="gpt-4-turbo")
        
        drafting_prompt = (
            f"You are in drafting mode for the document '{self.active_draft['filename']}'. "
            "Your primary goal is to generate content for this document. "
            "Wrap the content in <draft_content></draft_content> tags.\n\n"
            f"User's instruction: {user_query}"
        )
        
        # This is a direct LLM call now, not using a chain
        response = llm.invoke(drafting_prompt)
        raw_answer = str(response.content)

        match = re.search(r'<draft_content>(.*?)</draft_content>', raw_answer, re.DOTALL)
        if match:
            draft_content = match.group(1).strip()
            if self.active_draft.get('content'):
                self.active_draft['content'] += f"\n\n{draft_content}"
            else:
                self.active_draft['content'] = draft_content
            return re.sub(r'<draft_content>.*?</draft_content>', draft_content, raw_answer, flags=re.DOTALL).strip()
        else:
            return raw_answer
    
    def _handle_command(self, user_input: str) -> str:
        """Parses and dispatches slash commands."""
        parts = user_input.strip().split()
        command = parts[0].lower()
        args = parts[1:] if len(parts) > 1 else []

        if command == "/create":
            return self._handle_create_command(args)
        elif command == "/save":
            return self._handle_save_command()
        elif command == "/list":
            return self._handle_list_command()
        elif command == "/help":
            return self._handle_help_command()
        else:
            return f"Unknown command: '{command}'. Type /help for a list of commands."

    def _handle_create_command(self, args: List[str]) -> str:
        from project_manager import document_exists
        
        if not args:
            return "Usage: /create <filename.md>"
        
        filename = args[0]
        if not filename.endswith('.md'):
            return "Error: Filename must end with .md"
        
        if document_exists(self.project_folder, filename):
            return f"Error: '{filename}' already exists. Please choose a different name."
        
        if self.active_draft:
            # Note: In the real implementation, this should be handled in main.py
            # to properly get user input. For now, we'll return a message
            return "Error: You have an unsaved draft. Please save it with /save or start a new session."

        self.active_draft = {"filename": filename, "content": ""}
        return f"OK, let's draft `{filename}`. How should we begin?"

    def _handle_save_command(self) -> str:
        from project_manager import save_document
        
        if not self.active_draft:
            return "No active draft to save. Use /create <filename.md> to start one."
        
        filename = self.active_draft['filename']
        content = self.active_draft.get('content', '').strip()
        
        if not content:
            return "Cannot save an empty document. Please add some content first."
        
        save_document(self.project_folder, filename, content)
        
        self.active_draft = None  # Clear the draft
        return f"Successfully saved `{filename}`."

    def _handle_list_command(self) -> str:
        from project_manager import list_documents
        
        docs = list_documents(self.project_folder)
        if not docs:
            return "No documents found in this project."
        
        response = "Documents in this project:\n"
        response += "\n".join([f"- {doc}" for doc in docs])
        return response

    def _handle_help_command(self) -> str:
        return """Available Commands:
/create <filename.md>  - Start a new document draft
/save                  - Save the current active draft to a file
/list                  - List all .md documents in the project
/help                  - Show this help message
/exit or quit          - Exit the application"""

    def has_unsaved_draft(self) -> bool:
        """Check if there's an active draft with content."""
        return self.active_draft is not None and bool(self.active_draft.get('content', '').strip())
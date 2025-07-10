# PRD: PolGen Phase 3 - Document Generation & Command Palette

## Introduction/Overview

This document outlines the requirements for Phase 3 of the PolGen application. This phase will build on the interactive session functionality by introducing a "Command Palette" and a workflow for generating persistent markdown documents.

**Problem:** While users can have a conversation with the AI, they cannot create tangible, saved outputs from their research. The current application is a conversational partner but not yet a productive writing tool. All generated content is ephemeral and exists only within the conversation history.

**Feature:** We will implement a system of "slash commands" (e.g., `/create`, `/save`) that allows users to direct the AI to draft, accumulate, and save content into `.md` files within their project. This introduces a new "drafting mode" to the application.

**Goal:** To create a demoable workflow where a user can initiate the creation of a document, have a guided conversation with the AI to write its content, and save that content to a permanent file in their project directory.

---

## Goals

*   **Functionality:** A user can create, save, and list markdown documents within a project using simple slash commands.
*   **State Management:** The application can cleanly enter and exit a "drafting mode," managing an in-memory draft of a document before it is saved.
*   **User Experience:** The command system is intuitive and provides helpful feedback and safeguards against common errors (e.g., trying to save nothing, overwriting files, exiting with unsaved work).
*   **AI Control:** The AI's behavior is specifically adapted for document drafting, distinguishing between writing content and having a meta-conversation.

---

## User Stories

*   **As a policy analyst, I want to command the AI to start a new document for me** so I can begin a structured writing task like a problem statement or a policy brief.
*   **As a researcher, I want to have a back-and-forth conversation to build up a document piece by piece** so I can use the AI's research capabilities to generate paragraphs which are then added to my draft.
*   **As a user, I want to save my drafted document to a file at any time** so I can make the output of my session permanent.
*   **As a user, I want to be protected from accidentally overwriting existing files or losing unsaved work** so I can use the tool with confidence.
*   **As a user, I want a list of available commands and project files** so I can easily understand what actions I can take and what documents I've already created.

---

## Functional Requirements

### FR1: Command Parsing and Dispatch
1.  The main application loop must be updated to parse user input. If the input string starts with a `/`, it must be treated as a command. Otherwise, it is treated as a regular chat message.
2.  A command dispatcher must be implemented to route recognized commands to their specific handler functions.

### FR2: The "Drafting Mode" State
1.  The application must manage an internal state to track when it is in "drafting mode."
2.  An in-memory "active draft" object must be maintained. This object will store the target filename and the accumulated content of the document being drafted.
    *   Example structure: `{"filename": "problem_statement.md", "content": "This is the first paragraph..."}`
3.  This active draft is created when the user successfully runs the `/create` command and is cleared (set to `null` or empty) after a successful `/save` command or when the user explicitly discards it.

### FR3: `/create <filename.md>` Command
1.  The system must recognize the `/create` command.
2.  The command requires one argument: a filename ending in `.md`.
    *   If no argument is provided (user types just `/create`), the system must respond with a usage message (e.g., "Usage: /create <filename.md>") and not enter drafting mode.
3.  The system must check if a file with the given name already exists in the current project's directory.
    *   If the file exists, the command must fail with a clear error message (e.g., "Error: `problem_statement.md` already exists. Please choose a different name.") and not enter drafting mode.
4.  The system must check if there is an existing "active draft" that has not yet been saved.
    *   If an unsaved draft exists, the system must prompt the user for confirmation (e.g., "You have an unsaved draft. Do you want to discard it and start a new one? [y/n]"). The command only proceeds if the user types `y`.
5.  On successful execution, the system must:
    *   Create the "active draft" object in memory (e.g., `{"filename": "new_doc.md", "content": ""}`).
    *   Enter "drafting mode."
    *   Send a confirmation message to the user (e.g., "OK, let's draft `new_doc.md`. How should we begin?").

### FR4: AI Behavior in Drafting Mode
1.  When in drafting mode, the system prompt sent to the LLM must be modified to instruct it on its new role.
    *   **System Prompt Addendum:** "You are now in drafting mode for the document `{filename}`. Your primary goal is to generate content for this document based on the user's instructions. When you are providing content that should be part of the document, you MUST wrap it in `<draft_content>` and `</draft_content>` tags. For conversational remarks, questions, or confirmations, do NOT use these tags."
2.  The application must be able to parse the LLM's response. If it contains the `<draft_content>` tags, the application must extract the content within them and append it to the `content` property of the in-memory "active draft" object. The tags themselves should not be saved or displayed to the user.

### FR5: `/save` Command
1.  The system must recognize the `/save` command.
2.  The command must check if an "active draft" exists in memory.
    *   If no active draft exists, the system must respond with an informational message (e.g., "No active draft to save. Use `/create <filename.md>` to start one.") and take no further action.
3.  On successful execution, the system must:
    *   Write the content from the `active_draft.content` to a new file with the name specified in `active_draft.filename` inside the current project's directory.
    *   Clear the in-memory "active draft" object, effectively exiting drafting mode.
    *   Send a confirmation message to the user (e.g., "Successfully saved `problem_statement.md`.").

### FR6: `/list` Command
1.  The system must recognize the `/list` command.
2.  Upon execution, the system must scan the current project's directory and display a list of all files that end with the `.md` extension.
3.  The output should be clearly formatted. Example:
    ```
    Documents in this project:
    - problem_statement.md
    - policy_options.md
    ```

### FR7: `/help` Command
1.  The system must recognize the `/help` command.
2.  Upon execution, it must display a formatted list of all available commands and their functions. The list must include: `/create`, `/save`, `/list`, `/help`, and `/exit` (and its `quit` alias).

### FR8: Safeguards and History Logging
1.  **Unsaved Exit:** If the user attempts to exit (via `/exit`, `quit`, or `Ctrl+C`) while an "active draft" exists, the system must prompt for confirmation (e.g., "You have unsaved changes. Are you sure you want to exit? [y/n]"). The application only exits if the user types `y`.
2.  **Conversation History:** All user commands (e.g., `/create report.md`) and the system's corresponding responses (e.g., "OK, let's draft `report.md`.") must be saved to the `conversation_history.json` file, just like regular chat messages.

---

## Non-Goals (Out of Scope for Phase 3)

*   **No Document Editing:** This phase only covers the creation and saving of new documents. An `/edit` command for modifying existing files is not included.
*   **No Intra-Project Awareness:** The AI will not be able to read from files (`.md` or otherwise) that have already been saved in the project. Its context is limited to the RAG search and the active conversation.
*   **No Deleting or Renaming:** There will be no `/delete` or `/rename` commands for managing files.
*   **No Advanced AI Drafting:** The AI will append content linearly. It will not be able to go back and revise a paragraph that is already part of the active draft. The user's only recourse for a mistake is to discard the draft and start over.

---

## Design Considerations

*   **Stateful Orchestrator:** The `Orchestrator` module will need to be significantly enhanced to manage the "drafting mode" state and the "active draft" object.
*   **Clear Feedback:** It is critical that the user always knows whether they are in drafting mode or standard chat mode. The application's responses should make this clear.

## Technical Considerations

*   **Prompt Engineering:** The special system prompt for drafting mode is critical and must be implemented precisely. The use of `<draft_content>` tags is a key part of the technical design for reliably separating content from conversation.
*   **Modular Command Handling:** The command dispatcher should be designed in a way that is easily extensible for future commands in later phases. A dictionary mapping command strings to handler functions is a recommended pattern.

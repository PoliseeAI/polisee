# PolGen Phase 2: Acceptance Test Plan

## Objective
To verify that the features specified in the "PolGen Phase 2 - Interactive Project Sessions" PRD have been implemented correctly. A human tester will follow these step-by-step instructions to ensure the application meets all functional requirements.

## Pre-requisites
- The PolGen application has been successfully installed with all required dependencies.
- The `polgen` database is running and populated with the document corpus.
- The `projects/` directory in the application root is either empty or does not exist.

---

### Test Case 1: First Run and Project Creation

**Goal:** Verify that the application can be run for the first time, create a new project with a valid name, and set up the correct file structure.

| Step | Action | Expected Result | Pass/Fail |
| :--- | :--- | :--- | :--- |
| 1.1 | Open a terminal and navigate to the application's root directory. | Command prompt is ready. | |
| 1.2 | Run the application: `python main.py` | The `projects/` directory is created in the file system. The application prompts: `Load existing project or create new one? [load/create]:` | |
| 1.3 | Type `create` and press Enter. | The application prompts: `Enter new project name:` | |
| 1.4 | Enter the name `Test Project Alpha` and press Enter. | A message appears: `Project 'Test Project Alpha' created at: projects/test-project-alpha`. The application enters the interactive chat session with the prompt: `(Test Project Alpha) > ` | |
| 1.5 | In a separate terminal or file explorer, inspect the `projects/` directory. | A new folder named `test-project-alpha` exists. | |
| 1.6 | Inspect the contents of the `projects/test-project-alpha/` folder. | The folder contains two files: `project.json` and `conversation_history.json`. | |
| 1.7 | Open `project.json`. | The file contains the text: `{"name": "Test Project Alpha"}` (formatting may vary). | |
| 1.8 | Open `conversation_history.json`. | The file contains the text: `[]`. | |
| 1.9 | Return to the application and exit by typing `/exit`. | The application prints an exit message and terminates. | |

---

### Test Case 2: Interactive Conversation and History Persistence

**Goal:** Verify that the application can hold a multi-turn conversation and saves the history correctly after each turn.

| Step | Action | Expected Result | Pass/Fail |
| :--- | :--- | :--- | :--- |
| 2.1 | Run `python main.py`. At the prompt, type `load`. | The application lists available projects, including `1. test-project-alpha`. | |
| 2.2 | Select the project by typing its number (`1`) and pressing Enter. | The application enters the chat session with the prompt: `(Test Project Alpha) > ` | |
| 2.3 | Ask a question related to your corpus, e.g., `What is rent control?` | The AI provides a relevant answer. | |
| 2.4 | Immediately after the AI responds, open `conversation_history.json` in the `projects/test-project-alpha/` folder. | The file now contains two entries: one with `role: "user"` and your question, and one with `role: "assistant"` and the AI's answer. | |
| 2.5 | In the application, ask a follow-up question that relies on context, e.g., `What are its main drawbacks?` | The AI provides an answer specific to the drawbacks of rent control, demonstrating it remembers the previous topic. | |
| 2.6 | Re-check the `conversation_history.json` file. | The file is now updated and contains four entries (two user/assistant pairs). | |
| 2.7 | Exit the application using `Ctrl+C`. | The application exits gracefully with a message, without a stack trace. | |

---

### Test Case 3: Project Naming Conventions and Uniqueness

**Goal:** Verify that project names with spaces are handled correctly and that duplicate folder names are prevented.

| Step | Action | Expected Result | Pass/Fail |
| :--- | :--- | :--- | :--- |
| 3.1 | Run `python main.py` and choose `create`. | The application prompts for a new project name. | |
| 3.2 | Enter the name `Test Project Alpha` again. | A new project is created. A message indicates the creation path: `projects/test-project-alpha-1`. The application enters the chat session with the prompt: `(Test Project Alpha) > ` | |
| 3.3 | Check the `projects/` directory. | Two folders now exist: `test-project-alpha` and `test-project-alpha-1`. | |
| 3.4 | Open `projects/test-project-alpha-1/project.json`. | The `name` field correctly shows the original name: `{"name": "Test Project Alpha"}`. | |
| 3.5 | Exit the application using `quit`. | The application terminates. | |

---

### Test Case 4: Handling Edge Cases and Invalid Input

**Goal:** Verify that the application handles user errors and edge cases gracefully.

| Step | Action | Expected Result | Pass/Fail |
| :--- | :--- | :--- | :--- |
| 4.1 | Delete the `projects/` directory entirely. | Directory is gone. | |
| 4.2 | Run `python main.py`. | The `projects/` directory is automatically re-created. The application prompts: `Load existing project or create new one? [load/create]:` | |
| 4.3 | Type `load` and press Enter. | The application prints a message like "No projects found. Please create one first." and re-displays the `[load/create]` prompt. | |
| 4.4 | At the `[load/create]` prompt, type `invalid-command` and press Enter. | The application prints an error message like "Invalid command." and re-displays the `[load/create]` prompt. | |
| 4.5 | Choose `create`, but press Enter without typing a name. | The application prints an error message like "Project name cannot be empty." and prompts for a name again. | |
| 4.6 | Create a new project named "Final Test" to enter the chat session. | The chat session starts. | |
| 4.7 | Exit the application. | The application terminates. | |

# PolGen Acceptance Testing Plan

This document outlines the test cases for verifying the application's functionality, focusing on the command palette and document drafting workflow. Each test case includes steps for a human tester to follow and the expected outcome.

---

### Test Environment Setup

1.  If a `projects/` directory exists, please delete it to ensure a clean testing environment.
2.  Launch the application by running `python main.py`.
3.  When prompted, create a new project. Name it `Test Project`. This will be the workspace for all subsequent tests.

---

### Test Suite 1: Command Palette & Basic Commands

**Objective:** Verify that the basic commands work as expected.

**TC-1.1: Verify `/help` command**
*   **Steps to Reproduce:**
    1.  At the `(Test Project) >` prompt, type `/help`.
*   **Expected Result:**
    *   A formatted list of commands appears.
    *   The list includes `/create`, `/save`, `/list`, `/help`, and `/exit`.

**TC-1.2: Verify `/list` on an empty project**
*   **Steps to Reproduce:**
    1.  At the prompt, type `/list`.
*   **Expected Result:**
    *   The application responds with a message indicating no documents were found, such as "No documents found in this project."

**TC-1.3: Verify unknown command handling**
*   **Steps to Reproduce:**
    1.  At the prompt, type `/foo`.
*   **Expected Result:**
    *   The application responds with an error message, such as "Unknown command: '/foo'. Type /help for a list of commands."

---

### Test Suite 2: Document Creation Workflow (`/create`)

**Objective:** Verify the logic and safeguards around the `/create` command.

**TC-2.1: Successful document creation**
*   **Steps to Reproduce:**
    1.  At the prompt, type `/create test-doc-1.md`.
*   **Expected Result:**
    *   The application responds with a confirmation message, such as "OK, let's draft `test-doc-1.md`. How should we begin?".
    *   The application enters a "drafting mode."

**TC-2.2: Fail to create with missing filename**
*   **Steps to Reproduce:**
    1.  At the prompt, type `/create`.
*   **Expected Result:**
    *   The application responds with a usage error, such as "Usage: /create <filename.md>".
    *   The application does not enter drafting mode.

**TC-2.3: Fail to create with non-`.md` file extension**
*   **Steps to Reproduce:**
    1.  At the prompt, type `/create test.txt`.
*   **Expected Result:**
    *   The application responds with an error message, such as "Error: Filename must end with .md".

**TC-2.4: Fail to create a file that already exists**
*   **Steps to Reproduce:**
    1.  First, successfully create and save `test-doc-1.md` by completing test case TC-3.1.
    2.  At the prompt, type `/create test-doc-1.md` again.
*   **Expected Result:**
    *   The application responds with an error message stating the file already exists, such as "Error: `test-doc-1.md` already exists...".

**TC-2.5: Warn user when starting a new draft with an unsaved active draft**
*   **Steps to Reproduce:**
    1.  Type `/create unsaved-draft.md`.
    2.  Type `/create another-draft.md`.
    3.  The application will prompt with a warning about an unsaved draft. Type `n` and press Enter.
*   **Expected Result:**
    *   The application responds with a cancellation message, such as "Create command cancelled."
    *   The active draft remains `unsaved-draft.md`.

**TC-2.6: Allow user to discard an unsaved draft**
*   **Steps to Reproduce:**
    1.  Follow the steps from TC-2.5.
    2.  When prompted with the warning, type `y` and press Enter.
*   **Expected Result:**
    *   The application proceeds to create the new draft for `another-draft.md` and responds with "OK, let's draft `another-draft.md`...".

---

### Test Suite 3: Drafting & Saving Workflow (`/save`)

**Objective:** Verify that content can be generated, accumulated into a draft, and saved to a file.

**TC-3.1: Create, draft, and save a document**
*   **Steps to Reproduce:**
    1.  Type `/create test-doc-1.md`.
    2.  When prompted, type `Write a paragraph about housing affordability.`
    3.  The AI will generate content.
    4.  Type `/save`.
*   **Expected Result:**
    *   The application responds with a success message: "Successfully saved `test-doc-1.md`."
    *   In the file system, inside the `projects/test-project/` folder, the file `test-doc-1.md` exists and contains the AI-generated paragraph.

**TC-3.2: Verify content accumulation in a draft**
*   **Steps to Reproduce:**
    1.  Type `/create multi-para.md`.
    2.  Type `Write paragraph one.`
    3.  After the AI responds, type `Write paragraph two.`
    4.  Type `/save`.
*   **Expected Result:**
    *   The `multi-para.md` file must contain both paragraph one and paragraph two, properly formatted.

**TC-3.3: Verify `/list` after saving a document**
*   **Steps to Reproduce:**
    1.  Successfully complete TC-3.1.
    2.  At the prompt, type `/list`.
*   **Expected Result:**
    *   The output list includes `test-doc-1.md`.

**TC-3.4: Fail to save when no draft is active**
*   **Steps to Reproduce:**
    1.  Ensure you have no active draft (e.g., right after starting the application or after a successful `/save`).
    2.  At the prompt, type `/save`.
*   **Expected Result:**
    *   The application responds with a message indicating there is no active draft to save.

**TC-3.5: Verify AI content parsing**
*   **Steps to Reproduce:**
    1.  Type `/create special-tags-test.md`.
    2.  Type `Write a sentence.`
    3.  Observe the response printed in the CLI.
*   **Expected Result:**
    *   The response in the CLI is the clean sentence itself. No special tags like `<draft_content>` are visible to the user.

---

### Test Suite 4: Safeguards & Session Integrity

**Objective:** Verify that the user is protected from data loss and the conversation history is correctly logged.

**TC-4.1: Warn user on exit with an unsaved draft**
*   **Steps to Reproduce:**
    1.  Type `/create unsaved-on-exit.md`.
    2.  Type a message to generate some content.
    3.  Type `/exit`.
    4.  When prompted with the warning, type `n` and press Enter.
*   **Expected Result:**
    *   The application does not exit and returns to the prompt, allowing the session to continue.

**TC-4.2: Allow user to exit and discard an unsaved draft**
*   **Steps to Reproduce:**
    1.  Follow the steps from TC-4.1.
    2.  When prompted with the warning, type `y` and press Enter.
*   **Expected Result:**
    *   The application exits gracefully.
    *   The file `unsaved-on-exit.md` was not created in the project folder.

**TC-4.3: Verify commands are logged in conversation history**
*   **Steps to Reproduce:**
    1.  Perform a sequence of actions: `/create log-test.md`, then chat, then `/save`.
    2.  Exit the application.
    3.  Open the `projects/test-project/conversation_history.json` file in a text editor.
*   **Expected Result:**
    *   The JSON file contains entries for each command and AI response, showing the complete flow of the session.
    *   An entry like `{"role": "user", "content": "/create log-test.md"}` must be present.

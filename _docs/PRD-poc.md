# PRD: Interactive Policy Generation CLI

-   **Feature:** PolGen Interactive Command-Line Interface (CLI)
-   **Status:** To Do
-   **Author:** Product Manager
-   **Stakeholders:** Lead Developer

---

### 1. Introduction/Overview

This project will create the first interactive proof-of-concept for the "PolGen" application. It will take the form of a Command-Line Interface (CLI) tool that guides a user through the initial phases of creating a public policy. The tool will simulate a chatbot, asking clarifying questions, performing "analysis," and generating real documents (as Markdown files) on the user's local machine.

The problem this solves is validating the core user workflow of our product—an AI-guided, phase-based process for policy creation—without the time and expense of building a full web-based user interface.

**The Goal:** To build a working, interactive CLI application that demonstrates the end-to-end flow of defining a policy problem, gathering evidence, and drafting an initial document, proving the value and feel of the proposed product.

### 2. Goals

*   Develop a CLI application that a user can run with a simple `python` command.
*   Implement a stateful, interactive conversation that guides a user through at least two distinct phases of policy creation (e.g., Definition and Evidence Gathering).
*   Successfully generate and save at least three different Markdown files to a new, project-specific directory on the user's local file system.
*   Integrate with an LLM (OpenAI) to generate the content for the summary and draft documents based on a small, pre-canned set of source texts.
*   Provide a polished and user-friendly terminal experience using formatted text and interactive prompts.

### 3. User Stories

*   **As a policy analyst, I want to start a new policy project from my terminal so that I can quickly begin defining a policy problem without needing to open a browser.**
*   **As a policy analyst, I want to be guided by an interactive prompt-based system so that I can clearly scope my policy's objectives and geography.**
*   **As a policy analyst, I want the tool to automatically perform an "analysis" and create summary documents for me so that I can save time on initial research.**
*   **As a policy analyst, I want to view the generated summaries directly in my terminal and have the full documents saved as local files so that I can easily access and review the outputs.**
*   **As a policy analyst, I want to command the tool to draft a policy brief based on the initial findings so that I can see the core value of the tool in generating a first draft.**

### 4. Functional Requirements

The system will be a Python script run from the command line, e.g., `python polgen_cli.py`.

**Project Management:**
1.  On first run, the system MUST create a new, uniquely named directory on the local filesystem to store all project-related files (e.g., `policy_readmissions_seniors_<timestamp>`).
2.  The system MUST be able to save its conversational progress (state) so a user could theoretically exit and resume later (though resume functionality is not required for the MVP).

**Interactive CLI:**
3.  The system MUST present the user with a text prompt to enter their initial policy goal.
4.  The system MUST present the user with an interactive multiple-choice question to select the policy's geography (e.g., using arrow keys).
5.  The system MUST present the user with a text input prompt to define the policy's success metric.
6.  The system MUST use formatted output (e.g., colors, bold text) to distinguish between bot messages, user inputs, and system status messages.
7.  The system MUST present the user with a confirmation prompt (y/n) before displaying large blocks of text, such as a summary.

**File Generation:**
8.  The system MUST generate and save a Markdown file containing a summary of a literature review (`LitReview_Summary.md`).
9.  The system MUST generate and save a Markdown file containing a summary of international models (`International_Models.md`).
10. The system MUST, upon user command, generate and save a Markdown file containing a draft policy brief (`Policy_Brief_Draft_v1.md`).

**AI & Data Logic:**
11. The system MUST load a small, pre-defined set of text documents (the "curated data source") from a local folder within the project.
12. The system MUST use an LLM to generate the content for the summary documents based on information retrieved from the curated data source.
13. The system MUST use an LLM to generate the content for the policy brief document based on the previously generated summaries.

### 5. Non-Goals (Out of Scope)

*   **No Web UI:** We will not build any HTML, CSS, or browser-based components. This is strictly a CLI tool.
*   **No User Accounts or Authentication:** The tool will run locally without any concept of users or logins.
*   **No Persistent Database:** We will not use a database like PostgreSQL for this version. Project state can be managed in memory or through simple files (e.g., a JSON file in the project directory).
*   **No Live Data Fetching:** The tool will NOT connect to external APIs (like GAO or PubMed) to fetch data in real-time. It will rely entirely on a small set of pre-packaged text files.
*   **No "Resume" Functionality:** While the state should be designed to be saveable, we will not implement the feature that allows a user to exit the CLI and resume their session exactly where they left off.
*   **No Advanced Error Handling:** The script can exit with a standard error message if something unexpected happens.

### 6. Design Considerations

*   **CLI Look & Feel:** The interface should feel modern and responsive. Use clear visual cues.
    *   Bot messages should be one color (e.g., green).
    *   User input prompts should be another (e.g., blue).
    *   System status/progress messages should be a third (e.g., cyan).
    *   Rendered Markdown should be formatted with clear headings, bullets, and bold text.
*   **Example Interaction Flow:**
    ```
    [green]Bot:[/green] Welcome! What policy do you want to develop?
    > [user types here]
    [green]Bot:[/green] Great. Let's scope this.
    [blue]Select geography:[/blue]
    » National
      State
    ...
    ```

### 7. Technical Considerations

*   **Python Libraries:**
    *   `questionary`: For creating the interactive prompts (select, text, confirm).
    *   `rich`: For all formatted console output, including colors, styles, and rendering Markdown.
    *   `langchain`: To manage the RAG pipeline, prompts, and interaction with the LLM.
    *   `langchain-openai`: For the specific OpenAI integration.
    *   A simple in-memory vector store library like `FAISS` is recommended.
*   **Project Structure:** A new directory should be created for the CLI app. Inside, there should be a `data/` sub-directory containing the curated `.txt` files for the RAG process.
*   **State Management:** A simple Python dictionary can hold the state for the current session (topic, geography, files created, etc.). This dictionary will be passed through the different functions representing the workflow phases.
*   **API Keys:** The OpenAI API key must be loaded from a `.env` file and not be hardcoded.

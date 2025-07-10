# PolGen CLI - Interactive Policy Generation Tool

A command-line interface tool that guides users through the initial phases of creating public policy documents using AI assistance.

## Features

- **Interactive CLI**: Guides you through policy definition and scoping
- **AI-Powered Analysis**: Analyzes curated data sources to generate insights
- **Document Generation**: Creates professional policy summaries and briefs
- **Beautiful Terminal UI**: Uses rich formatting for an enhanced experience

## Prerequisites

- Python 3.8 or higher
- OpenAI API key

## Installation

1. Clone this repository:
```bash
git clone <repository-url>
cd polgen-cli
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Set up your OpenAI API key:
```bash
cp env.example .env
# Edit .env and add your OpenAI API key
```

## Usage

Run the CLI tool:
```bash
python polgen_cli.py
```

The tool will guide you through:
1. **Policy Definition**: Define your policy topic and scope
2. **Evidence Gathering**: Analyze curated data sources
3. **Document Generation**: Create summaries and policy briefs

Generated documents will be saved in a project-specific directory.

## Project Structure

```
polgen-cli/
├── polgen_cli.py      # Main CLI application
├── engine.py          # Document processing and LLM logic
├── prompts.py         # Prompt templates
├── data/              # Curated data sources
├── requirements.txt   # Python dependencies
└── README.md          # This file
```

## Generated Output

The tool creates a new directory for each policy project containing:
- `1_Technical_Summary.md` - Analysis of relevant frameworks and stakeholder positions
- `2_Policy_Brief_Draft_v1.md` - Draft policy brief with recommendations

## License

This is a proof-of-concept application for demonstration purposes. 
# Housing Policy Query System

A vector search-powered Q&A system for housing policy documents.

## Features

- **Vector Search**: Uses pgvector to find the most relevant document chunks
- **LLM-Powered Answers**: Generates comprehensive answers using GPT-4
- **Source Attribution**: Shows which documents were used to answer each question
- **Interactive & Batch Modes**: Query interactively or process multiple questions

## Usage

### Interactive Mode

Run the script without arguments for an interactive session:

```bash
python query.py
```

Commands:
- Type your question and press Enter
- Type `help` to see sample questions
- Type `quit` or `exit` to stop

### Batch Mode

Process multiple questions from a file:

```bash
python query.py sample_questions.txt
```

## How It Works

1. **Query Embedding**: Your question is converted to a vector using OpenAI embeddings
2. **Vector Search**: The system finds the 5 most similar text chunks in the database
3. **Context Assembly**: Retrieved chunks are formatted with source information
4. **Answer Generation**: GPT-4 generates an answer based only on the retrieved context
5. **Source Display**: The system shows which documents contributed to the answer

## Sample Questions

See `sample_questions.txt` for examples. Some good starter questions:

- What percentage of renters are cost-burdened?
- How does zoning impact housing supply?
- What is inclusionary zoning?
- What are worst-case housing needs?
- What tenant protections are being discussed?

## Configuration

The system uses the same configuration as the ingestion pipeline:
- Database connection from `.env`
- OpenAI API key from `.env`
- Embedding model: text-embedding-3-small
- LLM model: gpt-4o-mini

## Tips

- Be specific in your questions for better results
- The system only answers based on the ingested documents
- If information isn't available, the system will say so
- Check the sources to verify the context of answers 
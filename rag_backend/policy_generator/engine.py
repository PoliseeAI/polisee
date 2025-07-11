"""
Engine module for document processing and LLM interactions.
"""

from pathlib import Path
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain.chains import RetrievalQA
from langchain.prompts import PromptTemplate
from langchain_core.documents import Document
import os


def load_and_process_documents():
    """Load documents from the data directory and create a retriever."""
    # Load all text files from the data directory
    data_dir = Path("data")
    documents = []
    
    for txt_file in data_dir.glob("*.txt"):
        with open(txt_file, "r", encoding="utf-8") as f:
            content = f.read()
            doc = Document(
                page_content=content,
                metadata={"source": txt_file.name}
            )
            documents.append(doc)
    
    # Split documents into chunks
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        length_function=len,
        separators=["\n\n", "\n", " ", ""]
    )
    splits = text_splitter.split_documents(documents)
    
    # Create embeddings and vector store
    embeddings = OpenAIEmbeddings()
    vectorstore = FAISS.from_documents(splits, embeddings)
    
    # Create retriever
    retriever = vectorstore.as_retriever(search_kwargs={"k": 5})
    
    return retriever


def run_summary_chain(retriever, prompt_template, topic):
    """Run a chain to generate a summary based on retrieved documents."""
    llm = ChatOpenAI(temperature=0.7, model="gpt-4o-mini")
    
    prompt = PromptTemplate(
        template=prompt_template,
        input_variables=["context", "question"]
    )
    
    qa_chain = RetrievalQA.from_chain_type(
        llm=llm,
        chain_type="stuff",
        retriever=retriever,
        chain_type_kwargs={"prompt": prompt},
        return_source_documents=False
    )
    
    # The RetrievalQA chain expects 'query' but our prompt uses 'topic'
    # We need to pass the topic as the query
    result = qa_chain.invoke({"query": topic})
    return result["result"]


def run_drafting_chain(summary_text, prompt_template):
    """Run a chain to draft a policy brief based on the summary."""
    llm = ChatOpenAI(temperature=0.7, model="gpt-4o-mini")
    
    prompt = PromptTemplate(
        template=prompt_template,
        input_variables=["summary"]
    )
    
    # Direct LLM call since we're not using retrieval here
    formatted_prompt = prompt.format(summary=summary_text)
    response = llm.invoke(formatted_prompt)
    
    return response.content 
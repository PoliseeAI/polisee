import os
import re
import json
import time
from lxml import etree
import requests
from bs4 import BeautifulSoup
from openai import OpenAI
from dotenv import load_dotenv
from tqdm import tqdm
import tiktoken

# --- Configuration ---
XML_FILE = "bbb.xml"
OUTPUT_SQL_FILE = "output_final.sql"
EMBEDDING_MODEL = "text-embedding-3-small"
LLM_MODEL = "gpt-4-turbo-preview"
VECTOR_DIMENSION = 1536
REQUEST_DELAY_SECONDS = 0.5
MAX_RETRIES = 3
MAX_TOKENS_FOR_EMBEDDING = 8191

# --- Development Limiter ---
# Set to an integer (e.g., 10) to process only the first N sections for testing.
# Set to None to process all sections.
MAX_SECTIONS_TO_PROCESS = None

# --- Load Environment Variables & Initialize Clients ---
load_dotenv()
if not os.getenv("OPENAI_API_KEY"):
    raise ValueError("OPENAI_API_KEY environment variable not found. Please set it in a .env file.")
client = OpenAI()
tokenizer = tiktoken.encoding_for_model(EMBEDDING_MODEL)

# --- Caching Dictionaries ---
usc_content_cache = {}
hierarchy_cache = {}
summary_cache = {}

def get_section_hierarchy(element):
    """Traverses up the XML tree to get the full title/subtitle context."""
    if element in hierarchy_cache: return hierarchy_cache[element]
    path = []
    current = element.getparent()
    while current is not None:
        tag = current.tag
        if tag in ['title', 'subtitle', 'part', 'subpart']:
            header_el = current.find('header')
            if header_el is not None and header_el.text:
                enum_el = current.find('enum')
                num = enum_el.text if enum_el is not None and enum_el.text else ''
                path.append(f"{tag.capitalize()} {num}: {header_el.text.strip()}")
        current = current.getparent()
    hierarchy_str = " -> ".join(reversed(path))
    hierarchy_cache[element] = hierarchy_str
    return hierarchy_str

def extract_usc_text_from_html(document):
    """User-provided function to extract legal text from govinfo HTML."""
    try:
        start_marker = "<!-- field-start:statute -->"
        end_marker = "<!-- field-end:statute -->"
        start = document.index(start_marker) + len(start_marker)
        end = document.index(end_marker)
        soup = BeautifulSoup(document[start:end].strip(), 'html.parser')
        return soup.get_text(separator='\n', strip=True)
    except ValueError:
        # Fallback for pages that might not have the markers
        soup = BeautifulSoup(document, 'html.parser')
        content_area = soup.find('div', class_='content-area')
        if content_area:
            return content_area.get_text(separator='\n', strip=True)
        return "[Markers not found, could not parse specific statute content]"
    except Exception as e:
        return f"[HTML parsing error: {e}]"

def fetch_usc_content(cite: str) -> str:
    """Fetches US Code content from govinfo.gov with caching and retries."""
    if cite in usc_content_cache: return usc_content_cache[cite]
    try:
        parts = cite.split('/')
        if len(parts) != 3 or parts[0] != 'usc': return f"[Unsupported Cite Format: {cite}]"
        title, section = parts[1], parts[2]
        url = f"https://www.govinfo.gov/link/uscode/{title}/{section}?link-type=html"
        for attempt in range(MAX_RETRIES):
            try:
                response = requests.get(url, timeout=20)
                time.sleep(REQUEST_DELAY_SECONDS)
                if response.status_code == 200:
                    text = extract_usc_text_from_html(response.text)
                    usc_content_cache[cite] = text
                    return text
                print(f"    Attempt {attempt + 1}: Failed to fetch {cite}. Status: {response.status_code}")
            except requests.RequestException as e:
                print(f"    Attempt {attempt + 1}: Request failed for {cite}: {e}")
            time.sleep(2 ** attempt)
        usc_content_cache[cite] = f"[Failed to fetch content for {cite}]"
        return usc_content_cache[cite]
    except Exception as e:
        print(f"    Error processing cite {cite}: {e}")
        return f"[Error processing cite: {cite}]"

def get_embedding(text: str):
    """Generates an embedding, handling tokenization and potential truncation."""
    try:
        tokens = tokenizer.encode(text)
        if len(tokens) > MAX_TOKENS_FOR_EMBEDDING:
            print(f"    Warning: Chunk is too long ({len(tokens)} tokens). Truncating to {MAX_TOKENS_FOR_EMBEDDING}.")
            tokens = tokens[:MAX_TOKENS_FOR_EMBEDDING]
        
        response = client.embeddings.create(input=[tokens], model=EMBEDDING_MODEL)
        return response.data[0].embedding
    except Exception as e:
        print(f"    Could not generate embedding. Error: {e}")
        return None

def get_summary(text_to_summarize: str, purpose: str):
    """Generates a summary of a long text document using an LLM."""
    if text_to_summarize in summary_cache: return summary_cache[text_to_summarize]
    print(f"    Generating summary for {purpose}...")
    system_prompt = """You are an expert legislative text summarizer. Create a concise, factual summary of the provided text.
Focus on the core action: What law is being changed? What is the specific change? What are the key entities, concepts, or dollar amounts involved?
Keep the summary factual and dense. Do not add interpretation."""
    try:
        response = client.chat.completions.create(
            model=LLM_MODEL,
            messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": f"Summarize:\n\n{text_to_summarize}"}],
            temperature=0.0, max_tokens=512
        )
        summary = response.choices[0].message.content
        summary_cache[text_to_summarize] = summary
        return summary
    except Exception as e:
        print(f"    Could not generate summary. Error: {e}")
        return f"Summary generation failed for {purpose}."

def create_chunk_data(base_data, chunk_type, content):
    """Creates a dictionary for a chunk, generates its embedding, and returns it."""
    token_count = len(tokenizer.encode(content))
    if token_count > MAX_TOKENS_FOR_EMBEDDING:
        print(f"    Chunk '{chunk_type}' for section {base_data['section_number']} is too long ({token_count} tokens). Summarizing.")
        content_to_embed = get_summary(content, f"{chunk_type} of Section {base_data['section_number']}")
    else:
        content_to_embed = content

    embedding = get_embedding(content_to_embed)
    if not embedding:
        return None
        
    return {**base_data, "chunk_type": chunk_type, "content": content, "embedding": embedding}

def process_section(section_element):
    """Processes a single <section> and returns a list of chunk data dictionaries."""
    section_id = section_element.get('id', '')
    if not section_id: return []

    # Common metadata
    section_number_el = section_element.find('enum')
    section_number = section_number_el.text.strip('.') if section_number_el is not None else "N/A"
    section_header_el = section_element.find('header')
    section_header = section_header_el.text if section_header_el is not None else "No Header"
    hierarchy = get_section_hierarchy(section_element)
    
    root = section_element.getroottree().getroot()
    bill_title = root.find('.//dublinCore/dc:title', namespaces={'dc': 'http://purl.org/dc/elements/1.1/'}).text
    bill_number = root.find('.//legis-num').text

    base_data = {
        "section_id": section_id,
        "bill_title": bill_title,
        "bill_number": bill_number,
        "section_number": section_number,
        "section_header": section_header,
        "committee": hierarchy.split(' -> ')[0] if ' -> ' in hierarchy else hierarchy,
        "subtitle": hierarchy.split(' -> ')[1] if ' -> ' in hierarchy else None,
        "metadata": json.dumps({}) # Placeholder for now
    }
    
    chunks = []
    
    # --- Chunk 1: Section-level Summary ---
    full_section_text = etree.tostring(section_element, method='text', encoding='unicode').strip()
    full_section_text = re.sub(r'\s+', ' ', full_section_text)
    section_summary_text = get_summary(full_section_text, f"Section {section_number}")
    summary_chunk = create_chunk_data(base_data, 'section_summary', section_summary_text)
    if summary_chunk: chunks.append(summary_chunk)
        
    # --- Chunks 2+: Structural Chunks (Subsections, etc.) ---
    # **This is the key change:** Use .// to find descendants, not just direct children.
    subsections = section_element.xpath('.//subsection')
    
    if subsections:
        for i, sub_element in enumerate(subsections):
            sub_text = etree.tostring(sub_element, method='text', encoding='unicode').strip()
            sub_text = re.sub(r'\s+', ' ', sub_text)
            
            # Add context for better embedding quality
            chunk_content = f"From Section {section_number} ({section_header}):\n{sub_text}"
            
            sub_chunk = create_chunk_data(base_data, f"subsection_{i+1}", chunk_content)
            if sub_chunk: chunks.append(sub_chunk)
    else:
        # If no subsections, the whole section text is the main chunk.
        # We already summarized it, now we embed the full text if possible.
        chunk_content = f"Section {section_number} ({section_header}):\n{full_section_text}"
        full_section_chunk = create_chunk_data(base_data, 'full_section_text', chunk_content)
        if full_section_chunk: chunks.append(full_section_chunk)

    return chunks

def format_sql(chunk_data):
    """Formats a chunk data dictionary into a SQL INSERT statement."""
    data = chunk_data.copy()
    for key in ['section_id', 'chunk_type', 'content', 'bill_title', 'bill_number', 'section_number', 'section_header', 'committee', 'subtitle', 'metadata']:
        if key in data and data[key] is not None:
            data[key] = str(data[key]).replace("'", "''")

    sql = f"""
INSERT INTO bill_chunks (section_id, chunk_type, content, embedding, bill_title, bill_number, section_number, section_header, committee, subtitle, metadata)
VALUES (
    '{data['section_id']}', '{data['chunk_type']}', '{data['content']}', '{str(data['embedding'])}',
    '{data['bill_title']}', '{data['bill_number']}', '{data.get('section_number', 'N/A')}',
    '{data.get('section_header', 'N/A')}', '{data.get('committee', 'N/A')}',
    '{data.get('subtitle') or 'N/A'}', '{data['metadata']}'::jsonb
);"""
    return sql

def main():
    print(f"Parsing XML file: {XML_FILE}")
    try:
        parser = etree.XMLParser(recover=True)
        tree = etree.parse(XML_FILE, parser)
        root = tree.getroot()
    except Exception as e:
        print(f"Error parsing XML file: {e}")
        return

    sections = root.xpath('//section')
    
    # **NEW:** Apply the processing limit if it's set
    if MAX_SECTIONS_TO_PROCESS is not None:
        print(f"--- Limiting processing to the first {MAX_SECTIONS_TO_PROCESS} sections for development. ---")
        sections = sections[:MAX_SECTIONS_TO_PROCESS]
        
    total_sections = len(sections)
    print(f"Found {total_sections} sections to process.")

    with open(OUTPUT_SQL_FILE, 'w', encoding='utf-8') as f_out:
        f_out.write("-- SQL script generated by process_bill_final.py\n")
        f_out.write("TRUNCATE TABLE bill_chunks RESTART IDENTITY; -- Clear table before inserting new data\n")
        f_out.write("BEGIN;\n\n")

        processed_chunks_count = 0
        for section in tqdm(sections, desc="Processing sections"):
            chunks_for_section = process_section(section)
            for chunk_data in chunks_for_section:
                sql_statement = format_sql(chunk_data)
                f_out.write(sql_statement)
                processed_chunks_count += 1

        f_out.write("\nCOMMIT;\n")

    print(f"\nProcessing complete. Generated {processed_chunks_count} chunks from {total_sections} sections.")
    print(f"SQL script saved to '{OUTPUT_SQL_FILE}'.")
    print(f"You can now run this script against your PostgreSQL database.")

if __name__ == "__main__":
    main()

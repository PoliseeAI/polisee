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
OUTPUT_SQL_FILE = "output_v3.sql"
EMBEDDING_MODEL = "text-embedding-3-small"
LLM_MODEL = "gpt-4-turbo-preview"
VECTOR_DIMENSION = 1536
REQUEST_DELAY_SECONDS = 0.5
MAX_RETRIES = 3
MAX_TOKENS_FOR_EMBEDDING = 8191 # Max for text-embedding-3-small is 8192

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
    if element in hierarchy_cache: return hierarchy_cache[element]
    path = []
    current = element.getparent()
    while current is not None:
        tag = current.tag
        if tag in ['title', 'subtitle', 'part', 'subpart']:
            header_el = current.find('header')
            if header_el is not None and header_el.text:
                enum_el = current.find('enum')
                num = enum_el.text if enum_el is not None else ''
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
        return "[Markers not found, could not parse specific statute content]"
    except Exception as e:
        return f"[HTML parsing error: {e}]"

def fetch_usc_content(cite: str) -> str:
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

def generate_embedding(text: str):
    try:
        tokens = tokenizer.encode(text)
        if len(tokens) > MAX_TOKENS_FOR_EMBEDDING:
            tokens = tokens[:MAX_TOKENS_FOR_EMBEDDING]
        
        response = client.embeddings.create(input=[tokens], model=EMBEDDING_MODEL)
        return response.data[0].embedding
    except Exception as e:
        print(f"    Could not generate embedding. Error: {e}")
        return None

def generate_summary(text_to_summarize: str, purpose: str):
    if text_to_summarize in summary_cache: return summary_cache[text_to_summarize]
    print(f"    Generating summary for {purpose}...")
    system_prompt = f"""
You are a legislative text summarizer. Create a concise, factual summary of the provided text.
Focus on the core action: What law is being changed? What is the specific change?
Keep the summary factual and dense. Do not add interpretation.
"""
    try:
        response = client.chat.completions.create(
            model=LLM_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Please summarize this text for the purpose of '{purpose}':\n\n{text_to_summarize}"}
            ],
            temperature=0.0,
            max_tokens=512
        )
        summary = response.choices[0].message.content
        summary_cache[text_to_summarize] = summary
        return summary
    except Exception as e:
        print(f"    Could not generate summary. Error: {e}")
        return f"Summary generation failed for {purpose}."

def process_section(section_element):
    section_id = section_element.get('id', '')
    if not section_id: return []

    # Common metadata for all chunks from this section
    section_number_el = section_element.find('enum')
    section_number = section_number_el.text.strip('.') if section_number_el is not None else None
    section_header_el = section_element.find('header')
    section_header = section_header_el.text if section_header_el is not None else "No Header"
    hierarchy = get_section_hierarchy(section_element)
    
    root = section_element.getroottree().getroot()
    bill_title = root.find('.//dublinCore/dc:title', namespaces={'dc': 'http://purl.org/dc/elements/1.1/'}).text
    bill_number = root.find('.//legis-num').text

    xrefs = section_element.findall('.//external-xref')
    original_law_texts = {xref.get('parsable-cite'): fetch_usc_content(xref.get('parsable-cite')) 
                          for xref in xrefs if xref.get('legal-doc') == 'usc' and xref.get('parsable-cite')}
    
    base_data = {
        "section_id": section_id,
        "bill_title": bill_title,
        "bill_number": bill_number,
        "section_number": section_number,
        "section_header": section_header,
        "committee": hierarchy.split(' -> ')[0] if ' -> ' in hierarchy else hierarchy,
        "subtitle": hierarchy.split(' -> ')[1] if ' -> ' in hierarchy else None,
        "metadata": json.dumps({"amended_laws": list(original_law_texts.keys())})
    }
    
    chunks = []
    
    # 1. Create a summary chunk for the entire section
    full_section_text_for_summary = etree.tostring(section_element, method='text', encoding='unicode').strip()
    full_section_text_for_summary = re.sub(r'\s+', ' ', full_section_text_for_summary)
    
    section_summary_text = generate_summary(full_section_text_for_summary, f"Section {section_number} overall")
    summary_embedding = generate_embedding(section_summary_text)
    if summary_embedding:
        chunks.append({**base_data, "chunk_type": "section_summary", "content": section_summary_text, "embedding": summary_embedding})

    # 2. Create chunks for each subsection or logical block within the section
    subsections = section_element.xpath('./subsection|./paragraph[not(parent::subsection)]|./text()[normalize-space()]|./quoted-block')
    if not subsections: # Handle simple sections with no subsections
        subsections = [section_element]

    for sub_element in subsections:
        if isinstance(sub_element, etree._Element):
            sub_text = etree.tostring(sub_element, method='text', encoding='unicode').strip()
            sub_text = re.sub(r'\s+', ' ', sub_text)
            
            chunk_header = f"Context from Section {section_number} ({section_header}):\n"
            final_chunk_text = chunk_header + sub_text
            chunk_type = sub_element.tag
        else: # Handle text nodes directly under <section>
            final_chunk_text = str(sub_element).strip()
            chunk_type = 'section_text_node'

        if not final_chunk_text:
            continue

        token_count = len(tokenizer.encode(final_chunk_text))
        
        if token_count > MAX_TOKENS_FOR_EMBEDDING:
            # If a subsection is still too long, summarize it
            content_to_embed = generate_summary(final_chunk_text, "long subsection")
        else:
            content_to_embed = final_chunk_text
            
        embedding = generate_embedding(content_to_embed)
        if embedding:
            chunks.append({**base_data, "chunk_type": chunk_type, "content": final_chunk_text, "embedding": embedding})

    return chunks

def format_sql(chunk_data):
    """Formats a chunk data dictionary into a SQL INSERT statement."""
    # Create a copy to avoid modifying the original dict
    data = chunk_data.copy()
    
    # Escape single quotes in text fields
    for key in ['section_id', 'chunk_type', 'content', 'bill_title', 'bill_number', 'section_number', 'section_header', 'committee', 'subtitle', 'metadata']:
        if key in data and data[key] is not None:
            data[key] = str(data[key]).replace("'", "''")

    sql = f"""
INSERT INTO bill_chunks (section_id, chunk_type, content, embedding, bill_title, bill_number, section_number, section_header, committee, subtitle, metadata)
VALUES (
    '{data['section_id']}',
    '{data['chunk_type']}',
    '{data['content']}',
    '{str(data['embedding'])}',
    '{data['bill_title']}',
    '{data['bill_number']}',
    '{data.get('section_number', 'N/A')}',
    '{data.get('section_header', 'N/A')}',
    '{data.get('committee', 'N/A')}',
    '{data.get('subtitle') or 'N/A'}',
    '{data['metadata']}'::jsonb
);
"""
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
    total_sections = len(sections)
    print(f"Found {total_sections} sections to process.")

    with open(OUTPUT_SQL_FILE, 'w', encoding='utf-8') as f_out:
        f_out.write("-- SQL script generated by process_bill_v3.py\n")
        f_out.write("TRUNCATE TABLE bill_chunks; -- Clear table before inserting new data\n")
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

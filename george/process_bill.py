import os
import re
import json
import time
from xml.etree import ElementTree
from lxml import etree # Using lxml for robust XPath support
import requests
from bs4 import BeautifulSoup
from openai import OpenAI
from dotenv import load_dotenv
from tqdm import tqdm

# --- Configuration ---
XML_FILE = "bbb.xml"
OUTPUT_SQL_FILE = "output.sql"
EMBEDDING_MODEL = "text-embedding-3-small" # Efficient and high-quality model
VECTOR_DIMENSION = 1536 # Dimension for text-embedding-3-small
REQUEST_DELAY_SECONDS = 0.5 # To be respectful to the govinfo server
MAX_RETRIES = 3

# --- Load Environment Variables ---
load_dotenv()
if not os.getenv("OPENAI_API_KEY"):
    raise ValueError("OPENAI_API_KEY environment variable not found. Please set it in a .env file.")

# --- Initialize OpenAI Client ---
client = OpenAI()

# --- Caching Dictionaries ---
usc_content_cache = {}
hierarchy_cache = {}


def get_section_hierarchy(element):
    """Traverses up the XML tree to get the full title/subtitle context."""
    if element in hierarchy_cache:
        return hierarchy_cache[element]

    path = []
    current = element.getparent()
    while current is not None:
        tag = current.tag
        if tag in ['title', 'subtitle', 'part', 'subpart']:
            header_element = current.find('header')
            if header_element is not None and header_element.text:
                num_element = current.find('enum')
                num = num_element.text if num_element is not None and num_element.text else ''
                path.append(f"{tag.capitalize()} {num}: {header_element.text.strip()}")
        current = current.getparent()
    
    hierarchy_str = " -> ".join(reversed(path))
    hierarchy_cache[element] = hierarchy_str
    return hierarchy_str

def fetch_usc_content(cite: str) -> str:
    """Fetches the content of a US Code citation from govinfo.gov and caches it."""
    if cite in usc_content_cache:
        return usc_content_cache[cite]

    try:
        parts = cite.split('/')
        if len(parts) != 3 or parts[0] != 'usc':
            return f"[Unsupported Cite Format: {cite}]"
        
        title, section = parts[1], parts[2]
        url = f"https://www.govinfo.gov/link/uscode/{title}/{section}?link-type=html"
        
        print(f"    Fetching {url}...")
        for attempt in range(MAX_RETRIES):
            try:
                response = requests.get(url, timeout=20)
                time.sleep(REQUEST_DELAY_SECONDS) # Be polite
                if response.status_code == 200:
                    soup = BeautifulSoup(response.text, 'html.parser')
                    # Find the main content area for US Code sections
                    content_area = soup.find('div', class_='content-area')
                    if content_area:
                        text = content_area.get_text(separator='\n', strip=True)
                        usc_content_cache[cite] = text
                        return text
                    else:
                        usc_content_cache[cite] = "[Content not found on page]"
                        return "[Content not found on page]"
                else:
                    print(f"    Attempt {attempt + 1}: Failed to fetch {cite}. Status code: {response.status_code}")

            except requests.RequestException as e:
                print(f"    Attempt {attempt + 1}: Request failed for {cite}: {e}")
            
            time.sleep(2 ** attempt) # Exponential backoff

        usc_content_cache[cite] = f"[Failed to fetch content for {cite} after {MAX_RETRIES} attempts]"
        return f"[Failed to fetch content for {cite} after {MAX_RETRIES} attempts]"

    except Exception as e:
        print(f"    Error processing cite {cite}: {e}")
        return f"[Error processing cite: {cite}]"

def generate_embedding(text: str):
    """Generates a vector embedding for the given text using OpenAI's API."""
    try:
        response = client.embeddings.create(
            input=text,
            model=EMBEDDING_MODEL
        )
        return response.data[0].embedding
    except Exception as e:
        print(f"    Could not generate embedding. Error: {e}")
        return None

def synthesize_context(section_id, section_number, section_header, hierarchy, bill_text, original_law_texts):
    """Creates the rich, self-contained document for a single bill section."""
    context_parts = []
    
    # 1. Bill Section Information
    context_parts.append(f"Bill Section ID: {section_id}")
    if section_number:
        context_parts.append(f"Section Number: {section_number}")
    if section_header:
        context_parts.append(f"Section Header: {section_header}")
    if hierarchy:
        context_parts.append(f"Location in Bill: {hierarchy}")
    
    context_parts.append("\n--- TEXT FROM THE BILL ---")
    context_parts.append(bill_text.strip())

    # 2. Original Law Context
    if original_law_texts:
        context_parts.append("\n--- REFERENCED LAW (Original Text) ---")
        for cite, text in original_law_texts.items():
            context_parts.append(f"\nCONTEXT FOR {cite}:\n{text}")
            
    # 3. Create a summary of the action for the LLM
    # This is a simplified "as-amended" synthesis. It just describes the action.
    action_summary = "This section "
    if "amended to read as follows" in bill_text:
        action_summary += "replaces the text of the referenced law with the new text provided in the bill."
    elif "is amended" in bill_text:
        action_summary += "amends the referenced law by striking, inserting, or adding text."
    elif "is repealed" in bill_text:
        action_summary += "repeals the referenced law."
    else:
        action_summary = "This section contains appropriations or other directives."
        
    context_parts.insert(4, f"Action Summary: {action_summary}")

    return "\n".join(context_parts)

def process_section(section_element):
    """Processes a single <section> element and returns structured data."""
    section_id = section_element.get('id', '')
    
    # Extract basic info
    section_number_el = section_element.find('enum')
    section_number = section_number_el.text.strip('.') if section_number_el is not None else None
    
    section_header_el = section_element.find('header')
    section_header = section_header_el.text if section_header_el is not None else "No Header"
    
    hierarchy = get_section_hierarchy(section_element)
    
    # Extract text and references
    bill_text = etree.tostring(section_element, method='text', encoding='unicode').strip()
    bill_text = re.sub(r'\s+', ' ', bill_text) # Normalize whitespace

    xrefs = section_element.findall('.//external-xref')
    original_law_texts = {}
    for xref in xrefs:
        if xref.get('legal-doc') == 'usc':
            cite = xref.get('parsable-cite')
            if cite:
                original_law_texts[cite] = fetch_usc_content(cite)

    # Synthesize the full context
    full_context = synthesize_context(
        section_id, section_number, section_header, hierarchy, bill_text, original_law_texts
    )
    
    # Generate embedding
    embedding = generate_embedding(full_context)
    if embedding is None:
        return None # Skip this section if embedding fails
        
    # Prepare metadata
    metadata = {
        "amended_laws": list(original_law_texts.keys()),
        "raw_bill_text": bill_text,
    }
    
    # Get the bill title and number from the root
    root = section_element.getroottree().getroot()
    bill_title = root.find('.//dublinCore/dc:title', namespaces={'dc': 'http://purl.org/dc/elements/1.1/'}).text
    bill_number = root.find('.//legis-num').text

    return {
        "id": section_id,
        "bill_title": bill_title,
        "bill_number": bill_number,
        "section_number": section_number,
        "section_header": section_header,
        "committee": hierarchy.split(' -> ')[0] if ' -> ' in hierarchy else hierarchy,
        "subtitle": hierarchy.split(' -> ')[1] if ' -> ' in hierarchy else None,
        "full_context_text": full_context,
        "embedding": embedding,
        "metadata": metadata
    }

def format_sql(data):
    """Formats the data dictionary into a SQL INSERT statement."""
    # Escape single quotes in text fields
    id_val = data['id'].replace("'", "''")
    bill_title_val = data['bill_title'].replace("'", "''") if data['bill_title'] else 'NULL'
    bill_number_val = data['bill_number'].replace("'", "''") if data['bill_number'] else 'NULL'
    section_number_val = data['section_number'].replace("'", "''") if data['section_number'] else 'NULL'
    section_header_val = data['section_header'].replace("'", "''") if data['section_header'] else 'NULL'
    committee_val = data['committee'].replace("'", "''") if data['committee'] else 'NULL'
    subtitle_val = data['subtitle'].replace("'", "''") if data['subtitle'] else 'NULL'
    full_context_text_val = data['full_context_text'].replace("'", "''")
    
    # Format embedding and metadata
    embedding_val = str(data['embedding'])
    metadata_val = json.dumps(data['metadata']).replace("'", "''")

    sql = f"""
INSERT INTO bill_sections (id, bill_title, bill_number, section_number, section_header, committee, subtitle, full_context_text, embedding, metadata)
VALUES (
    '{id_val}',
    '{bill_title_val}',
    '{bill_number_val}',
    '{section_number_val}',
    '{section_header_val}',
    '{committee_val}',
    '{subtitle_val}',
    '{full_context_text_val}',
    '{embedding_val}',
    '{metadata_val}'::jsonb
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
        f_out.write("-- SQL script generated by process_bill.py\n")
        f_out.write("BEGIN;\n\n")

        for section in tqdm(sections, desc="Processing sections"):
            processed_data = process_section(section)
            
            if processed_data:
                sql_statement = format_sql(processed_data)
                f_out.write(sql_statement)
                f_out.write("\n")

        f_out.write("COMMIT;\n")

    print(f"\nProcessing complete. SQL script saved to '{OUTPUT_SQL_FILE}'.")
    print("You can now run this script against your PostgreSQL database.")
    print("Example: psql -U your_username -d your_database -f output.sql")


if __name__ == "__main__":
    main()

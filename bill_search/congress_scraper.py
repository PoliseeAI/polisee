import requests
import psycopg2
import psycopg2.extras
from bs4 import BeautifulSoup
import sys

# --- Configuration ---
API_KEY = "BoqcMqfrLh0zanaNNBKL6O7nDwsziAdTbcY7frfq"
BILLS_API_URL = "https://api.congress.gov/v3/bill"
API_PARAMS = {"api_key": API_KEY, "format": "json"}

# --- Database Configuration ---
DB_NAME = "bills"
DB_USER = "postgres"
DB_PASSWORD = "postgres"
DB_HOST = "localhost"
DB_PORT = "5432"

def get_db_connection():
    """Establishes and returns a connection to the PostgreSQL database."""
    try:
        conn = psycopg2.connect(
            dbname=DB_NAME, user=DB_USER, password=DB_PASSWORD, host=DB_HOST, port=DB_PORT
        )
        return conn
    except psycopg2.OperationalError as e:
        print(f"CRITICAL: Could not connect to the database: {e}", file=sys.stderr)
        return None

def fetch_data(url, params=None, is_json=True):
    """Fetches data from a URL. Can handle JSON or raw text."""
    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        return response.json() if is_json else response.text
    except requests.exceptions.RequestException as e:
        print(f"Warning: Could not fetch data from {url}: {e}", file=sys.stderr)
        return None

def strip_html_tags(html_content):
    """Strips all HTML tags from a string and returns plain text."""
    if not html_content:
        return None
    soup = BeautifulSoup(html_content, "html.parser")
    return soup.get_text(separator='\n', strip=True)

def process_bills():
    """Main function to fetch bills, summaries, and texts, and save them to the DB."""
    conn = get_db_connection()
    if not conn:
        sys.exit(1)

    print("Fetching list of bills...")
    list_params = {**API_PARAMS, "limit": 250}
    bill_list_data = fetch_data(BILLS_API_URL, params=list_params)

    if not bill_list_data or "bills" not in bill_list_data:
        print("CRITICAL: Failed to fetch or parse the list of bills. Exiting.", file=sys.stderr)
        conn.close()
        sys.exit(1)

    bills = bill_list_data["bills"]
    print(f"Found {len(bills)} bills to process.")

    for bill in bills:
        # Each bill is processed in its own transaction
        with conn.cursor() as cur:
            bill_identifier = f"{bill.get('type')} {bill.get('number')}"
            print(f"\nProcessing bill: {bill_identifier}...")

            try:
                # --- 1. Save the main bill info to get a DB ID ---
                latest_action = bill.get('latestAction', {})
                sql_insert_bill = """
                    INSERT INTO bills (congress, number, type, origin_chamber, title, url, latest_action_date, latest_action_text)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (congress, type, number) 
                    DO UPDATE SET
                        origin_chamber = EXCLUDED.origin_chamber, title = EXCLUDED.title, url = EXCLUDED.url,
                        latest_action_date = EXCLUDED.latest_action_date, latest_action_text = EXCLUDED.latest_action_text
                    RETURNING id;
                """
                cur.execute(sql_insert_bill, (
                    bill.get('congress'), bill.get('number'), bill.get('type'),
                    bill.get('originChamber'), bill.get('title'), bill.get('url'),
                    latest_action.get('actionDate'), latest_action.get('text')
                ))
                bill_db_id = cur.fetchone()[0]
                print(f"  > Saved/Updated bill {bill_identifier} with DB ID: {bill_db_id}")

                bill_api_url = bill.get('url')
                if not bill_api_url:
                    print("  > Skipping sub-requests due to missing bill URL.")
                    conn.commit() # Commit the bill insert even if it has no URL
                    continue

                base_url = bill_api_url.split('?')[0]

                # --- 2. Fetch and save summaries for the bill ---
                summaries_url = f"{base_url}/summaries"
                print(f"  > Fetching summaries from {summaries_url}...")
                summaries_data = fetch_data(summaries_url, params=API_PARAMS)
                if summaries_data and summaries_data.get("summaries"):
                    for summary in summaries_data["summaries"]:
                        sql_insert_summary = """
                            INSERT INTO bill_summaries (bill_id, version_code, action_date, action_desc, text, update_date)
                            VALUES (%s, %s, %s, %s, %s, %s)
                            ON CONFLICT (bill_id, version_code) DO UPDATE SET
                                action_date = EXCLUDED.action_date, action_desc = EXCLUDED.action_desc,
                                text = EXCLUDED.text, update_date = EXCLUDED.update_date;
                        """
                        cur.execute(sql_insert_summary, (
                            bill_db_id, summary.get('versionCode'), summary.get('actionDate'),
                            summary.get('actionDesc'), summary.get('text'), summary.get('updateDate')
                        ))
                    print(f"  > Saved/Updated {len(summaries_data['summaries'])} summaries.")
                else:
                    print(f"  > No summaries found.")
                
                # --- 3. Fetch, process, and save the full bill text ---
                full_text_content = None
                texts_url = f"{base_url}/text"
                print(f"  > Fetching texts from {texts_url}...")
                text_versions_data = fetch_data(texts_url, params=API_PARAMS)

                if text_versions_data and text_versions_data.get("textVersions"):
                    first_text_version = text_versions_data["textVersions"][0]
                    text_html_url = None
                    for fmt in first_text_version.get('formats', []):
                        if fmt.get('type') == 'Formatted Text':
                            text_html_url = fmt.get('url')
                            break
                    
                    if text_html_url:
                        print(f"    > Found Formatted Text URL: {text_html_url}")
                        html_content = fetch_data(text_html_url, is_json=False)
                        full_text_content = strip_html_tags(html_content)
                        if full_text_content:
                            sql_update_bill_text = "UPDATE bills SET full_text = %s WHERE id = %s;"
                            cur.execute(sql_update_bill_text, (full_text_content, bill_db_id))
                            print("    > Successfully processed and queued bill text for saving.")
                        else:
                            print("    > Warning: Could not strip text from HTML content.")
                    else:
                        print("    > Warning: 'Formatted Text' type not found in first text version.")
                else:
                    print("  > No text versions found.")

            except (Exception, psycopg2.Error) as error:
                print(f"ERROR processing bill {bill_identifier}: {error}", file=sys.stderr)
                print("  > Rolling back transaction for this bill.", file=sys.stderr)
                conn.rollback()
            else:
                # If no errors occurred for this bill, commit its transaction
                conn.commit()
                print(f"  > Transaction for bill {bill_identifier} committed.")

    # Close the database connection at the end
    conn.close()
    print("\nScript finished.")

if __name__ == "__main__":
    process_bills()

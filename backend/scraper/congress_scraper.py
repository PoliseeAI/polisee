import requests
import time
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from dateutil.parser import parse as parse_date
import json

try:
    from .config import Config
except ImportError:
    from config import Config

logger = logging.getLogger(__name__)

class CongressScraper:
    def __init__(self):
        Config.validate()
        self.api_key = Config.CONGRESS_API_KEY
        self.base_url = Config.CONGRESS_API_BASE_URL
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Congress-Scraper/1.0'
        })
        
    def _make_request(self, endpoint: str, params: Optional[Dict] = None) -> Dict:
        """Make a request to the Congress.gov API with retry logic and timeout."""
        if params is None:
            params = {}
        
        params['api_key'] = self.api_key
        params['format'] = 'json'
        
        url = f"{self.base_url.rstrip('/')}/{endpoint.lstrip('/')}"
        
        for attempt in range(Config.MAX_RETRIES):
            try:
                # Add timeout to prevent hanging
                response = self.session.get(url, params=params, timeout=30)
                response.raise_for_status()
                
                time.sleep(Config.REQUEST_DELAY)
                return response.json()
                
            except requests.exceptions.Timeout:
                logger.warning(f"Request timed out (attempt {attempt + 1}/{Config.MAX_RETRIES}): {url}")
                if attempt == Config.MAX_RETRIES - 1:
                    raise
                time.sleep(2 ** attempt)  # Exponential backoff
            except requests.exceptions.RequestException as e:
                logger.warning(f"Request failed (attempt {attempt + 1}/{Config.MAX_RETRIES}): {e}")
                if attempt == Config.MAX_RETRIES - 1:
                    raise
                time.sleep(2 ** attempt)  # Exponential backoff
        
        # This should never be reached due to the raise above, but for type safety
        return {}
    
    def get_bills(self, congress: int = 118, limit: int = 250, offset: int = 0) -> Dict:
        """Fetch bills from a specific Congress."""
        endpoint = f"bill/{congress}"
        params = {
            'limit': limit,
            'offset': offset
        }
        return self._make_request(endpoint, params)
    
    def get_recent_bills(self, days: int = 30, max_bills: Optional[int] = None) -> List[Dict]:
        """Fetch bills with recent activity in the last N days."""
        bills = []
        congress = 118  # Current Congress
        offset = 0
        limit = 250
        
        cutoff_date = datetime.now() - timedelta(days=days)
        
        while True:
            response = self.get_bills(congress, limit, offset)
            
            if not response.get('bills'):
                break
                
            for bill in response['bills']:
                # Try multiple date fields since introducedDate isn't available in basic API
                date_to_check = None
                
                # Priority 1: Latest action date (most recent activity)
                if bill.get('latestAction', {}).get('actionDate'):
                    date_to_check = bill['latestAction']['actionDate']
                
                # Priority 2: Update date (when bill was last updated)
                elif bill.get('updateDate'):
                    date_to_check = bill['updateDate']
                
                # Priority 3: Update date including text
                elif bill.get('updateDateIncludingText'):
                    date_to_check = bill['updateDateIncludingText']
                
                if not date_to_check:
                    # If no date found, skip this bill
                    continue
                    
                try:
                    recent_date = parse_date(date_to_check)
                    
                    # Remove timezone info for comparison if present
                    if recent_date.tzinfo:
                        recent_date = recent_date.replace(tzinfo=None)
                    
                    if recent_date >= cutoff_date:
                        bills.append(bill)
                        
                        # If we have a max_bills limit and reached it, stop
                        if max_bills and len(bills) >= max_bills:
                            return bills
                    
                except Exception as e:
                    logger.warning(f"Error parsing date {date_to_check}: {e}")
                    continue
                    
            offset += limit
            
            # Safety check to avoid infinite loops - reduced from 10000 to 2000
            if offset > 2000:
                logger.warning("Reached maximum offset limit, stopping")
                break
                
        return bills

    def get_latest_bills(self, limit: int = 20) -> List[Dict]:
        """Fetch the latest bills (most recent first, no date filtering)."""
        congress = 118  # Current Congress
        response = self.get_bills(congress, limit, 0)
        return response.get('bills', [])
    
    def get_bill_details(self, congress: int, bill_type: str, bill_number: int) -> Dict:
        """Fetch detailed information about a specific bill."""
        endpoint = f"bill/{congress}/{bill_type}/{bill_number}"
        return self._make_request(endpoint)
    
    def get_bill_actions(self, congress: int, bill_type: str, bill_number: int) -> Dict:
        """Fetch actions for a specific bill."""
        endpoint = f"bill/{congress}/{bill_type}/{bill_number}/actions"
        return self._make_request(endpoint)
    
    def get_bill_amendments(self, congress: int, bill_type: str, bill_number: int) -> Dict:
        """Fetch amendments for a specific bill."""
        endpoint = f"bill/{congress}/{bill_type}/{bill_number}/amendments"
        return self._make_request(endpoint)
    
    def get_bill_cosponsors(self, congress: int, bill_type: str, bill_number: int) -> Dict:
        """Fetch cosponsors for a specific bill."""
        endpoint = f"bill/{congress}/{bill_type}/{bill_number}/cosponsors"
        return self._make_request(endpoint)
    
    def get_bill_subjects(self, congress: int, bill_type: str, bill_number: int) -> Dict:
        """Fetch subjects/topics for a specific bill."""
        endpoint = f"bill/{congress}/{bill_type}/{bill_number}/subjects"
        return self._make_request(endpoint)
    
    def get_bill_summaries(self, congress: int, bill_type: str, bill_number: int) -> Dict:
        """Fetch summaries for a specific bill."""
        endpoint = f"bill/{congress}/{bill_type}/{bill_number}/summaries"
        return self._make_request(endpoint)
    
    def get_bill_text(self, congress: int, bill_type: str, bill_number: int) -> Dict:
        """Fetch text versions for a specific bill."""
        endpoint = f"bill/{congress}/{bill_type}/{bill_number}/text"
        return self._make_request(endpoint)
    
    def get_members(self, congress: int, chamber: Optional[str] = None) -> Dict:
        """Fetch members of Congress."""
        endpoint = "member"
        params: Dict[str, Any] = {"congress": congress}
        if chamber:
            params["chamber"] = chamber
        return self._make_request(endpoint, params)
    
    def get_member_details(self, member_id: str) -> Dict:
        """Fetch detailed information about a specific member."""
        endpoint = f"member/{member_id}"
        return self._make_request(endpoint)
    
    def get_committees(self, congress: int, chamber: Optional[str] = None) -> Dict:
        """Fetch committees for a specific Congress."""
        if chamber:
            endpoint = f"committee/{congress}/{chamber}"
        else:
            endpoint = f"committee/{congress}"
        return self._make_request(endpoint)
    
    def get_committee_details(self, congress: int, chamber: str, committee_code: str) -> Dict:
        """Fetch detailed information about a specific committee."""
        endpoint = f"committee/{congress}/{chamber}/{committee_code}"
        return self._make_request(endpoint)
    
    def get_nominations(self, congress: int) -> Dict:
        """Fetch nominations for a specific Congress."""
        endpoint = f"nomination/{congress}"
        return self._make_request(endpoint)
    
    def get_congress_info(self, congress: int) -> Dict:
        """Fetch information about a specific Congress."""
        endpoint = f"congress/{congress}"
        return self._make_request(endpoint)
    
    def search_bills(self, query: str, congress: int = 118, limit: int = 250) -> Dict:
        """Search for bills using a query string."""
        endpoint = "bill"
        params = {
            'q': query,
            'congress': congress,
            'limit': limit
        }
        return self._make_request(endpoint, params)
    
    def get_enriched_bill_data(self, bill: Dict) -> Dict:
        """Fetch all related data for a bill (actions, amendments, cosponsors, etc.)."""
        congress = bill['congress']
        bill_type = bill['type']
        bill_number = bill['number']
        
        enriched_bill = bill.copy()
        
        try:
            # Get detailed bill information
            details = self.get_bill_details(congress, bill_type, bill_number)
            enriched_bill.update(details.get('bill', {}))
            
            # Get actions
            actions = self.get_bill_actions(congress, bill_type, bill_number)
            enriched_bill['actions'] = actions.get('actions', [])
            
            # Get amendments
            amendments = self.get_bill_amendments(congress, bill_type, bill_number)
            enriched_bill['amendments'] = amendments.get('amendments', [])
            
            # Get cosponsors
            cosponsors = self.get_bill_cosponsors(congress, bill_type, bill_number)
            enriched_bill['cosponsors'] = cosponsors.get('cosponsors', [])
            
            # Get subjects
            subjects = self.get_bill_subjects(congress, bill_type, bill_number)
            enriched_bill['subjects'] = subjects.get('subjects', [])
            
            # Get summaries
            summaries = self.get_bill_summaries(congress, bill_type, bill_number)
            enriched_bill['summaries'] = summaries.get('summaries', [])
            
            # Get text versions
            text_versions = self.get_bill_text(congress, bill_type, bill_number)
            enriched_bill['textVersions'] = text_versions.get('textVersions', [])
            
        except Exception as e:
            logger.error(f"Error enriching bill data for {bill_type}{bill_number}: {e}")
            
        return enriched_bill 
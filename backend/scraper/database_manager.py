import logging
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from supabase import create_client, Client
import json

try:
    from .config import Config
except ImportError:
    from config import Config

logger = logging.getLogger(__name__)

class DatabaseManager:
    def __init__(self):
        Config.validate()
        if not Config.SUPABASE_SERVICE_ROLE_KEY:
            raise ValueError("SUPABASE_SERVICE_ROLE_KEY is required for database operations")
        if not Config.SUPABASE_URL:
            raise ValueError("NEXT_PUBLIC_SUPABASE_URL is required for database operations")
        self.supabase: Client = create_client(
            Config.SUPABASE_URL,
            Config.SUPABASE_SERVICE_ROLE_KEY
        )
        
    def create_tables(self):
        """Create database tables if they don't exist."""
        # Note: These would typically be created via Supabase SQL editor or migration files
        # This is just for reference of the schema structure
        
        schemas = {
            'bills': """
                CREATE TABLE IF NOT EXISTS bills (
                    id SERIAL PRIMARY KEY,
                    bill_id VARCHAR(50) UNIQUE NOT NULL,
                    congress INTEGER NOT NULL,
                    type VARCHAR(10) NOT NULL,
                    number INTEGER NOT NULL,
                    title TEXT,
                    introduced_date DATE,
                    latest_action_date DATE,
                    latest_action TEXT,
                    sponsor_id VARCHAR(50),
                    sponsor_name VARCHAR(255),
                    sponsor_party VARCHAR(10),
                    sponsor_state VARCHAR(2),
                    is_active BOOLEAN DEFAULT TRUE,
                    policy_area VARCHAR(255),
                    cboc_estimate_url TEXT,
                    constitutional_authority_text TEXT,
                    origin_chamber VARCHAR(20),
                    update_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    raw_data JSONB
                );
            """,
            'bill_actions': """
                CREATE TABLE IF NOT EXISTS bill_actions (
                    id SERIAL PRIMARY KEY,
                    bill_id VARCHAR(50) NOT NULL,
                    action_date DATE,
                    action_code VARCHAR(20),
                    action_text TEXT,
                    source_system VARCHAR(50),
                    committee_code VARCHAR(20),
                    committee_name VARCHAR(255),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (bill_id) REFERENCES bills(bill_id)
                );
            """,
            'bill_cosponsors': """
                CREATE TABLE IF NOT EXISTS bill_cosponsors (
                    id SERIAL PRIMARY KEY,
                    bill_id VARCHAR(50) NOT NULL,
                    member_id VARCHAR(50) NOT NULL,
                    member_name VARCHAR(255),
                    party VARCHAR(10),
                    state VARCHAR(2),
                    district INTEGER,
                    sponsorship_date DATE,
                    is_withdrawn BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (bill_id) REFERENCES bills(bill_id)
                );
            """,
            'bill_subjects': """
                CREATE TABLE IF NOT EXISTS bill_subjects (
                    id SERIAL PRIMARY KEY,
                    bill_id VARCHAR(50) NOT NULL,
                    subject_name VARCHAR(255) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (bill_id) REFERENCES bills(bill_id)
                );
            """,
            'bill_summaries': """
                CREATE TABLE IF NOT EXISTS bill_summaries (
                    id SERIAL PRIMARY KEY,
                    bill_id VARCHAR(50) NOT NULL,
                    version_code VARCHAR(20),
                    action_date DATE,
                    action_desc VARCHAR(255),
                    update_date TIMESTAMP,
                    summary_text TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (bill_id) REFERENCES bills(bill_id)
                );
            """,
            'members': """
                CREATE TABLE IF NOT EXISTS members (
                    id SERIAL PRIMARY KEY,
                    member_id VARCHAR(50) UNIQUE NOT NULL,
                    congress INTEGER NOT NULL,
                    chamber VARCHAR(20) NOT NULL,
                    title VARCHAR(10),
                    first_name VARCHAR(100),
                    middle_name VARCHAR(100),
                    last_name VARCHAR(100),
                    suffix VARCHAR(20),
                    nickname VARCHAR(100),
                    full_name VARCHAR(255),
                    birth_year INTEGER,
                    death_year INTEGER,
                    party VARCHAR(10),
                    state VARCHAR(2),
                    district INTEGER,
                    leadership_role VARCHAR(100),
                    terms JSONB,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """,
            'committees': """
                CREATE TABLE IF NOT EXISTS committees (
                    id SERIAL PRIMARY KEY,
                    committee_code VARCHAR(20) UNIQUE NOT NULL,
                    congress INTEGER NOT NULL,
                    chamber VARCHAR(20) NOT NULL,
                    name VARCHAR(255),
                    committee_type VARCHAR(50),
                    parent_committee_code VARCHAR(20),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """
        }
        
        logger.info("Database schemas defined. Create these tables in your Supabase instance.")
        return schemas
    
    def insert_bill(self, bill_data: Dict) -> bool:
        """Insert a bill into the database."""
        try:
            # Extract main bill data
            bill_url = bill_data.get('url', '')
            bill_id = bill_url.split('/')[-1] if bill_url else f"{bill_data.get('congress', '')}-{bill_data.get('type', '')}-{bill_data.get('number', '')}"
            
            bill_record = {
                'bill_id': bill_id,
                'congress': bill_data.get('congress'),
                'type': bill_data.get('type'),
                'number': bill_data.get('number'),
                'title': bill_data.get('title'),
                'introduced_date': bill_data.get('introducedDate'),
                'latest_action_date': bill_data.get('latestAction', {}).get('actionDate'),
                'latest_action': bill_data.get('latestAction', {}).get('text'),
                'sponsor_id': bill_data.get('sponsors', [{}])[0].get('bioguideId') if bill_data.get('sponsors') else None,
                'sponsor_name': bill_data.get('sponsors', [{}])[0].get('fullName') if bill_data.get('sponsors') else None,
                'sponsor_party': bill_data.get('sponsors', [{}])[0].get('party') if bill_data.get('sponsors') else None,
                'sponsor_state': bill_data.get('sponsors', [{}])[0].get('state') if bill_data.get('sponsors') else None,
                'policy_area': bill_data.get('policyArea', {}).get('name'),
                'cboc_estimate_url': bill_data.get('cboCostEstimates', [{}])[0].get('url') if bill_data.get('cboCostEstimates') else None,
                'constitutional_authority_text': bill_data.get('constitutionalAuthorityStatementText'),
                'origin_chamber': bill_data.get('originChamber'),
                'raw_data': bill_data
            }
            
            # Upsert bill record
            result = self.supabase.table('bills').upsert(bill_record).execute()
            
            # Insert related data
            bill_id = bill_record['bill_id']
            
            # Insert actions
            if 'actions' in bill_data:
                self._insert_bill_actions(bill_id, bill_data['actions'])
            
            # Insert cosponsors
            if 'cosponsors' in bill_data:
                self._insert_bill_cosponsors(bill_id, bill_data['cosponsors'])
            
            # Insert subjects
            if 'subjects' in bill_data:
                self._insert_bill_subjects(bill_id, bill_data['subjects'])
            
            # Insert summaries
            if 'summaries' in bill_data:
                self._insert_bill_summaries(bill_id, bill_data['summaries'])
            
            logger.info(f"Successfully inserted bill {bill_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error inserting bill: {e}")
            return False
    
    def _insert_bill_actions(self, bill_id: str, actions: List[Dict]):
        """Insert bill actions."""
        try:
            action_records = []
            for action in actions:
                action_record = {
                    'bill_id': bill_id,
                    'action_date': action.get('actionDate'),
                    'action_code': action.get('actionCode'),
                    'action_text': action.get('text'),
                    'source_system': action.get('sourceSystem', {}).get('name'),
                    'committee_code': action.get('committees', [{}])[0].get('systemCode') if action.get('committees') else None,
                    'committee_name': action.get('committees', [{}])[0].get('name') if action.get('committees') else None
                }
                action_records.append(action_record)
            
            if action_records:
                self.supabase.table('bill_actions').upsert(action_records).execute()
                
        except Exception as e:
            logger.error(f"Error inserting bill actions: {e}")
    
    def _insert_bill_cosponsors(self, bill_id: str, cosponsors: List[Dict]):
        """Insert bill cosponsors."""
        try:
            cosponsor_records = []
            for cosponsor in cosponsors:
                cosponsor_record = {
                    'bill_id': bill_id,
                    'member_id': cosponsor.get('bioguideId'),
                    'member_name': cosponsor.get('fullName'),
                    'party': cosponsor.get('party'),
                    'state': cosponsor.get('state'),
                    'district': cosponsor.get('district'),
                    'sponsorship_date': cosponsor.get('sponsorshipDate'),
                    'is_withdrawn': cosponsor.get('sponsorshipWithdrawnDate') is not None
                }
                cosponsor_records.append(cosponsor_record)
            
            if cosponsor_records:
                self.supabase.table('bill_cosponsors').upsert(cosponsor_records).execute()
                
        except Exception as e:
            logger.error(f"Error inserting bill cosponsors: {e}")
    
    def _insert_bill_subjects(self, bill_id: str, subjects: List[Dict]):
        """Insert bill subjects."""
        try:
            subject_records = []
            for subject in subjects:
                subject_record = {
                    'bill_id': bill_id,
                    'subject_name': subject.get('name')
                }
                subject_records.append(subject_record)
            
            if subject_records:
                self.supabase.table('bill_subjects').upsert(subject_records).execute()
                
        except Exception as e:
            logger.error(f"Error inserting bill subjects: {e}")
    
    def _insert_bill_summaries(self, bill_id: str, summaries: List[Dict]):
        """Insert bill summaries."""
        try:
            summary_records = []
            for summary in summaries:
                summary_record = {
                    'bill_id': bill_id,
                    'version_code': summary.get('versionCode'),
                    'action_date': summary.get('actionDate'),
                    'action_desc': summary.get('actionDesc'),
                    'update_date': summary.get('updateDate'),
                    'summary_text': summary.get('text')
                }
                summary_records.append(summary_record)
            
            if summary_records:
                self.supabase.table('bill_summaries').upsert(summary_records).execute()
                
        except Exception as e:
            logger.error(f"Error inserting bill summaries: {e}")
    
    def get_recent_bills(self, days: int = 30) -> List[Dict]:
        """Get bills from the last N days."""
        try:
            cutoff_date = datetime.now().date() - timedelta(days=days)
            result = self.supabase.table('bills').select('*').gte('introduced_date', cutoff_date).execute()
            return result.data
        except Exception as e:
            logger.error(f"Error fetching recent bills: {e}")
            return []
    
    def get_bill_by_id(self, bill_id: str) -> Optional[Dict]:
        """Get a specific bill by ID."""
        try:
            result = self.supabase.table('bills').select('*').eq('bill_id', bill_id).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"Error fetching bill {bill_id}: {e}")
            return None
    
    def search_bills(self, query: str, limit: int = 100) -> List[Dict]:
        """Search bills by title or content."""
        try:
            # Using ilike for case-insensitive search
            result = self.supabase.table('bills').select('*').ilike('title', f'%{query}%').limit(limit).execute()
            return result.data
        except Exception as e:
            logger.error(f"Error searching bills: {e}")
            return []
    
    def get_bills_by_sponsor(self, sponsor_id: str) -> List[Dict]:
        """Get all bills by a specific sponsor."""
        try:
            result = self.supabase.table('bills').select('*').eq('sponsor_id', sponsor_id).execute()
            return result.data
        except Exception as e:
            logger.error(f"Error fetching bills by sponsor {sponsor_id}: {e}")
            return []
    
    def update_bill_status(self, bill_id: str, is_active: bool):
        """Update the active status of a bill."""
        try:
            self.supabase.table('bills').update({'is_active': is_active}).eq('bill_id', bill_id).execute()
            logger.info(f"Updated bill {bill_id} status to {is_active}")
        except Exception as e:
            logger.error(f"Error updating bill status: {e}")
    
    def insert_member(self, member_data: Dict) -> bool:
        """Insert a member into the database."""
        try:
            member_record = {
                'member_id': member_data.get('bioguideId'),
                'congress': member_data.get('congress'),
                'chamber': member_data.get('chamber'),
                'title': member_data.get('title'),
                'first_name': member_data.get('firstName'),
                'middle_name': member_data.get('middleName'),
                'last_name': member_data.get('lastName'),
                'suffix': member_data.get('suffix'),
                'nickname': member_data.get('nickname'),
                'full_name': member_data.get('name'),
                'birth_year': member_data.get('birthYear'),
                'death_year': member_data.get('deathYear'),
                'party': member_data.get('partyName'),
                'state': member_data.get('state'),
                'district': member_data.get('district'),
                'leadership_role': member_data.get('leadership', {}).get('role') if member_data.get('leadership') else None,
                'terms': member_data.get('terms', [])
            }
            
            self.supabase.table('members').upsert(member_record).execute()
            logger.info(f"Successfully inserted member {member_record['member_id']}")
            return True
            
        except Exception as e:
            logger.error(f"Error inserting member: {e}")
            return False
    
    def insert_committee(self, committee_data: Dict) -> bool:
        """Insert a committee into the database."""
        try:
            committee_record = {
                'committee_code': committee_data.get('systemCode'),
                'congress': committee_data.get('congress'),
                'chamber': committee_data.get('chamber'),
                'name': committee_data.get('name'),
                'committee_type': committee_data.get('type'),
                'parent_committee_code': committee_data.get('parent', {}).get('systemCode') if committee_data.get('parent') else None
            }
            
            self.supabase.table('committees').upsert(committee_record).execute()
            logger.info(f"Successfully inserted committee {committee_record['committee_code']}")
            return True
            
        except Exception as e:
            logger.error(f"Error inserting committee: {e}")
            return False

    def get_statistics(self) -> Dict:
        """Get database statistics."""
        try:
            stats = {}
            
            # Count total bills
            bills_result = self.supabase.table('bills').select('id').execute()
            stats['total_bills'] = len(bills_result.data)
            
            # Count active bills
            active_bills_result = self.supabase.table('bills').select('id').eq('is_active', True).execute()
            stats['active_bills'] = len(active_bills_result.data)
            
            # Count members
            members_result = self.supabase.table('members').select('id').execute()
            stats['total_members'] = len(members_result.data)
            
            # Count committees
            committees_result = self.supabase.table('committees').select('id').execute()
            stats['total_committees'] = len(committees_result.data)
            
            return stats
        except Exception as e:
            logger.error(f"Error getting statistics: {e}")
            return {} 
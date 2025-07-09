#!/usr/bin/env python3
"""
Cleanup script to remove bills with only metadata text
and prepare for bills with real legislative text
"""

import logging
import sys
import os
import asyncio
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database_manager import DatabaseManager

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('cleanup_metadata_bills.log'),
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)

def cleanup_metadata_bills():
    """Remove bills that only have metadata text (not full legislative text)"""
    try:
        logger.info("Starting cleanup of metadata-only bills...")
        
        db = DatabaseManager()
        
        # Get all bills
        result = db.supabase.table('bills').select('id, bill_id, title, text').execute()
        
        bills_to_delete = []
        metadata_indicators = [
            'TITLE:',
            'CONSTITUTIONAL AUTHORITY:',
            'POLICY AREA:',
            'LATEST ACTION',
            'ACTIONS: ',
            'SPONSORS:',
            'BILL INFO:'
        ]
        
        legislative_indicators = [
            'Congressional Bills',
            'Government Publishing Office',
            'CONGRESS',
            'Session',
            'IN THE HOUSE OF REPRESENTATIVES',
            'IN THE SENATE',
            'A BILL',
            'SECTION 1',
            'Be it enacted'
        ]
        
        for bill in result.data:
            text = bill.get('text', '') or ''
            
            # Check if this is metadata-only text
            metadata_count = sum(1 for indicator in metadata_indicators if indicator in text)
            legislative_count = sum(1 for indicator in legislative_indicators if indicator in text)
            
            # If it has metadata indicators but few/no legislative indicators, it's metadata-only
            if metadata_count >= 2 and legislative_count < 2:
                bills_to_delete.append({
                    'id': bill['id'],
                    'bill_id': bill['bill_id'],
                    'title': bill['title'][:60] + '...' if bill.get('title') else 'No title'
                })
        
        logger.info(f"Found {len(bills_to_delete)} metadata-only bills to delete")
        
        if bills_to_delete:
            # Show some examples
            logger.info("Examples of bills to delete:")
            for bill in bills_to_delete[:5]:
                logger.info(f"  - {bill['bill_id']}: {bill['title']}")
            
            if len(bills_to_delete) > 5:
                logger.info(f"  ... and {len(bills_to_delete) - 5} more")
            
            # Confirm deletion
            logger.info("Proceeding with deletion...")
            
            # Get bill IDs for deletion
            bill_ids_to_delete = [bill['bill_id'] for bill in bills_to_delete]
            
            # Delete related data first
            logger.info("Deleting related actions...")
            db.supabase.table('bill_actions').delete().in_('bill_id', bill_ids_to_delete).execute()
            
            logger.info("Deleting related cosponsors...")
            db.supabase.table('bill_cosponsors').delete().in_('bill_id', bill_ids_to_delete).execute()
            
            logger.info("Deleting related subjects...")
            db.supabase.table('bill_subjects').delete().in_('bill_id', bill_ids_to_delete).execute()
            
            logger.info("Deleting related summaries...")
            db.supabase.table('bill_summaries').delete().in_('bill_id', bill_ids_to_delete).execute()
            
            # Delete the bills themselves
            logger.info("Deleting bills...")
            db.supabase.table('bills').delete().in_('bill_id', bill_ids_to_delete).execute()
            
            logger.info(f"Successfully deleted {len(bills_to_delete)} metadata-only bills")
            
            # Show updated stats
            final_stats = db.get_statistics()
            logger.info(f"Updated database stats: {final_stats['total_bills']} bills remaining")
        else:
            logger.info("No metadata-only bills found to delete")
        
        return len(bills_to_delete)
        
    except Exception as e:
        logger.error(f"Error during cleanup: {e}")
        raise

if __name__ == "__main__":
    cleanup_metadata_bills() 
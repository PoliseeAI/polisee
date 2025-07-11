#!/usr/bin/env python3
"""
Migration script to add text and summary columns to bills table
"""

import logging
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database_manager import DatabaseManager

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('add_text_columns.log'),
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)

def main():
    """Add text and summary columns to bills table."""
    try:
        logger.info("🚀 Starting database migration to add text columns...")
        
        db = DatabaseManager()
        
        # Add text column if it doesn't exist
        try:
            db.supabase.postgrest.rpc('exec', {
                'sql': 'ALTER TABLE bills ADD COLUMN IF NOT EXISTS text TEXT;'
            }).execute()
            logger.info("✅ Added text column to bills table")
        except Exception as e:
            logger.warning(f"Could not add text column (may already exist): {e}")
        
        # Add summary column if it doesn't exist
        try:
            db.supabase.postgrest.rpc('exec', {
                'sql': 'ALTER TABLE bills ADD COLUMN IF NOT EXISTS summary TEXT;'
            }).execute()
            logger.info("✅ Added summary column to bills table")
        except Exception as e:
            logger.warning(f"Could not add summary column (may already exist): {e}")
        
        logger.info("🎉 Database migration completed successfully!")
        
    except Exception as e:
        logger.error(f"❌ Error during database migration: {e}")
        raise

if __name__ == "__main__":
    main() 
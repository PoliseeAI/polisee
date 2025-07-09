#!/usr/bin/env python3
"""
Comprehensive fix script to:
1. Add missing text/summary columns to database
2. Clean up bills without substantial text
3. Re-run scraper with improved text extraction
"""

import logging
import sys
import os
import asyncio
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from main import CongressScraperApp, cleanup_bills_without_text
from database_manager import DatabaseManager

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('fix_text_issue.log'),
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)

def add_missing_columns():
    """Add text and summary columns to bills table if they don't exist."""
    try:
        logger.info("🔧 Adding missing columns to bills table...")
        
        db = DatabaseManager()
        
        # Try to add columns using direct SQL
        try:
            # First, try to select from the columns to see if they exist
            result = db.supabase.table('bills').select('text, summary').limit(1).execute()
            logger.info("✅ Text and summary columns already exist")
            return True
        except Exception:
            # Columns don't exist, need to add them
            logger.info("📝 Adding text and summary columns...")
            
            # Since Supabase doesn't allow direct SQL DDL, we'll handle this differently
            # The columns might need to be added via the Supabase dashboard
            logger.warning("⚠️  You may need to add 'text' and 'summary' columns to the bills table in Supabase dashboard")
            logger.warning("⚠️  Both should be of type TEXT and nullable")
            
            return False
            
    except Exception as e:
        logger.error(f"❌ Error adding columns: {e}")
        return False

async def main():
    """Main fix process."""
    try:
        logger.info("🚀 Starting comprehensive text fix process...")
        
        # Step 1: Add missing columns
        logger.info("📊 Step 1: Adding missing database columns...")
        columns_added = add_missing_columns()
        
        if not columns_added:
            logger.info("⚠️  Please add 'text' and 'summary' columns to bills table in Supabase dashboard")
            logger.info("⚠️  Then run this script again")
            return
        
        # Step 2: Show current state
        logger.info("📊 Step 2: Checking current database state...")
        db = DatabaseManager()
        bills_without_text = db.get_bills_without_text()
        logger.info(f"Found {len(bills_without_text)} bills without substantial text")
        
        # Step 3: Clean up bills without text
        logger.info("🧹 Step 3: Cleaning up bills without text...")
        await cleanup_bills_without_text()
        
        # Step 4: Re-run scraper with improved text extraction
        logger.info("🔄 Step 4: Re-running scraper with improved text extraction...")
        app = CongressScraperApp()
        
        # First, test with 2 days to see if it works
        logger.info("🧪 Testing with 2 days of data...")
        stats = app.daily_update_with_notifications(days=2, mode='test')
        
        logger.info(f"✅ Test completed: {stats}")
        
        # Show final state
        final_stats = db.get_statistics()
        logger.info(f"📈 Final database stats: {final_stats}")
        
        logger.info("🎉 Text fix process completed successfully!")
        
    except Exception as e:
        logger.error(f"❌ Error during text fix process: {e}")
        raise

if __name__ == "__main__":
    asyncio.run(main()) 
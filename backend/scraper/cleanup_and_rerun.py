#!/usr/bin/env python3
"""
Cleanup script to remove bills without text and re-run scraper
"""

import logging
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from main import CongressScraperApp, cleanup_bills_without_text
import asyncio

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('cleanup_and_rerun.log'),
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)

async def main():
    """Main cleanup and rerun process."""
    try:
        logger.info("🚀 Starting cleanup and rerun process...")
        
        # Step 1: Clean up bills without text
        logger.info("📊 Step 1: Cleaning up bills without text...")
        await cleanup_bills_without_text()
        
        # Step 2: Re-run scraper with improved text extraction
        logger.info("🔄 Step 2: Re-running scraper with improved text extraction...")
        app = CongressScraperApp()
        stats = app.daily_update_with_notifications(days=2, mode='test')
        
        logger.info(f"✅ Cleanup and rerun completed successfully!")
        logger.info(f"📈 Final stats: {stats}")
        
    except Exception as e:
        logger.error(f"❌ Error during cleanup and rerun: {e}")
        raise

if __name__ == "__main__":
    asyncio.run(main()) 
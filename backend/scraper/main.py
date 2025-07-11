#!/usr/bin/env python3
"""
Congress.gov API Scraper - Main Application
Scrapes congressional data and stores it in Supabase
"""

import logging
import schedule
import time
import sys
from datetime import datetime
from typing import List, Dict, Optional
import asyncio

try:
    from .congress_scraper import CongressScraper
    from .database_manager import DatabaseManager
    from .config import Config
    from .notifications import NotificationManager
except ImportError:
    # Handle direct execution without package structure
    from congress_scraper import CongressScraper
    from database_manager import DatabaseManager
    from config import Config
    from notifications import NotificationManager

# Configure logging
logging.basicConfig(
    level=getattr(logging, Config.LOG_LEVEL, logging.INFO),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('congress_scraper.log'),
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)

class CongressScraperApp:
    def __init__(self):
        self.scraper = CongressScraper()
        self.db = DatabaseManager()
        self.notifier = NotificationManager()
        
    def initial_data_load(self):
        """Perform initial data load of recent bills and members."""
        logger.info("Starting initial data load...")
        
        try:
            # Load recent bills (last 90 days)
            self.sync_recent_bills(days=90)
            
            # Load current Congress members
            self.sync_members()
            
            # Load committees
            self.sync_committees()
            
            logger.info("Initial data load completed successfully")
            
        except Exception as e:
            logger.error(f"Error during initial data load: {e}")
            raise

    def test_mode(self, limit: int = 20):
        """Quick test mode - fetch just the latest bills."""
        logger.info(f"Running test mode - fetching latest {limit} bills...")
        
        try:
            # Get the latest bills (no date filtering)
            latest_bills = self.scraper.get_latest_bills(limit=limit)
            logger.info(f"Found {len(latest_bills)} latest bills")
            
            processed = 0
            for bill in latest_bills:
                try:
                    # Get enriched bill data
                    enriched_bill = self.scraper.get_enriched_bill_data(bill)
                    
                    # Store in database
                    if self.db.insert_bill(enriched_bill):
                        processed += 1
                        logger.info(f"Processed bill: {bill.get('title', 'Unknown')}")
                        
                    # Add small delay to be respectful to the API
                    time.sleep(Config.REQUEST_DELAY)
                    
                except Exception as e:
                    logger.error(f"Error processing bill {bill.get('number', 'unknown')}: {e}")
                    continue
            
            logger.info(f"Test mode completed - successfully processed {processed} bills")
            
        except Exception as e:
            logger.error(f"Error in test mode: {e}")
            raise
    
    def sync_recent_bills(self, days: int = 30, max_bills: Optional[int] = None):
        """Sync bills from the last N days."""
        logger.info(f"Syncing bills from the last {days} days...")
        
        try:
            recent_bills = self.scraper.get_recent_bills(days=days, max_bills=max_bills)
            logger.info(f"Found {len(recent_bills)} recent bills")
            
            processed = 0
            for bill in recent_bills:
                try:
                    # Get enriched bill data
                    enriched_bill = self.scraper.get_enriched_bill_data(bill)
                    
                    # Store in database
                    if self.db.insert_bill(enriched_bill):
                        processed += 1
                        
                    # Add small delay to be respectful to the API
                    time.sleep(Config.REQUEST_DELAY)
                    
                except Exception as e:
                    logger.error(f"Error processing bill {bill.get('number', 'unknown')}: {e}")
                    continue
            
            logger.info(f"Successfully processed {processed} bills")
            
        except Exception as e:
            logger.error(f"Error syncing recent bills: {e}")
            raise
    
    def sync_members(self, congress: int = 118):
        """Sync current Congress members."""
        logger.info(f"Syncing members for Congress {congress}...")
        
        try:
            # Get House members
            house_members = self.scraper.get_members(congress, 'house')
            logger.info(f"Found {len(house_members.get('members', []))} House members")
            
            # Get Senate members
            senate_members = self.scraper.get_members(congress, 'senate')
            logger.info(f"Found {len(senate_members.get('members', []))} Senate members")
            
            # Store members
            processed = 0
            for member in house_members.get('members', []):
                if self.db.insert_member(member):
                    processed += 1
                time.sleep(Config.REQUEST_DELAY)
            
            for member in senate_members.get('members', []):
                if self.db.insert_member(member):
                    processed += 1
                time.sleep(Config.REQUEST_DELAY)
            
            logger.info(f"Successfully processed {processed} members")
            
        except Exception as e:
            logger.error(f"Error syncing members: {e}")
            raise
    
    def sync_committees(self, congress: int = 118):
        """Sync congressional committees."""
        logger.info(f"Syncing committees for Congress {congress}...")
        
        try:
            # Get House committees
            house_committees = self.scraper.get_committees(congress, 'house')
            logger.info(f"Found {len(house_committees.get('committees', []))} House committees")
            
            # Get Senate committees
            senate_committees = self.scraper.get_committees(congress, 'senate')
            logger.info(f"Found {len(senate_committees.get('committees', []))} Senate committees")
            
            # Store committees
            processed = 0
            for committee in house_committees.get('committees', []):
                if self.db.insert_committee(committee):
                    processed += 1
                time.sleep(Config.REQUEST_DELAY)
            
            for committee in senate_committees.get('committees', []):
                if self.db.insert_committee(committee):
                    processed += 1
                time.sleep(Config.REQUEST_DELAY)
            
            logger.info(f"Successfully processed {processed} committees")
            
        except Exception as e:
            logger.error(f"Error syncing committees: {e}")
            raise
    
    def daily_update(self):
        """Daily update job - sync bills from the last 3 days."""
        logger.info("Running daily update...")
        try:
            self.sync_recent_bills(days=3)
        except Exception as e:
            logger.error(f"Error during daily update: {e}")
    
    def daily_update_with_notifications(self, days: int = 1, mode: str = 'daily'):
        """Daily update job with comprehensive notification support"""
        start_time = time.time()
        stats = {
            'bills_processed': 0,
            'new_bills': 0,
            'updated_bills': 0,
            'api_calls': 0,
            'errors': 0,
            'duration_seconds': 0,
            'mode': mode,
            'days': days
        }
        
        try:
            # Send start notification
            self.notifier.send_start_notification(mode, days)
            logger.info(f"Starting {mode} scraper for last {days} days...")
            
            # Get recent bills
            recent_bills = self.scraper.get_recent_bills(days=days)
            logger.info(f"Found {len(recent_bills)} recent bills")
            stats['api_calls'] += 1
            
            if not recent_bills:
                logger.info("No recent bills found")
                stats['duration_seconds'] = time.time() - start_time
                self.notifier.send_success_notification(stats)
                return stats
            
            # Process each bill
            for bill in recent_bills:
                try:
                    # Get enriched bill data
                    enriched_bill = self.scraper.get_enriched_bill_data(bill)
                    stats['api_calls'] += 3  # Approximate API calls for enriched data
                    
                    # Store in database
                    if self.db.insert_bill(enriched_bill):
                        stats['bills_processed'] += 1
                        stats['new_bills'] += 1  # Simplified - could be enhanced to track new vs updated
                        logger.info(f"Processed bill: {bill.get('number', 'Unknown')} - {bill.get('title', 'No title')[:100]}")
                    
                    # Respectful delay
                    time.sleep(Config.REQUEST_DELAY)
                    
                    # Send warning if too many errors
                    if stats['errors'] > 5:
                        self.notifier.send_warning_notification(
                            f"High error count during scraping: {stats['errors']} errors", 
                            stats
                        )
                        
                except Exception as e:
                    stats['errors'] += 1
                    logger.error(f"Error processing bill {bill.get('number', 'unknown')}: {e}")
                    continue
            
            # Calculate final stats
            stats['duration_seconds'] = time.time() - start_time
            
            # Send success notification
            self.notifier.send_success_notification(stats)
            
            logger.info(f"Daily update completed successfully. Processed {stats['bills_processed']} bills in {stats['duration_seconds']:.1f}s")
            return stats
            
        except Exception as e:
            stats['duration_seconds'] = time.time() - start_time
            error_message = str(e)
            
            # Send failure notification
            self.notifier.send_failure_notification(error_message, stats)
            
            logger.error(f"Daily update failed: {error_message}")
            raise
    
    def weekly_update(self):
        """Weekly update job - sync bills from the last week and update member data."""
        logger.info("Running weekly update...")
        try:
            self.sync_recent_bills(days=7)
            self.sync_members()
        except Exception as e:
            logger.error(f"Error during weekly update: {e}")
    
    def run_scheduler(self):
        """Run the scheduler for regular updates."""
        logger.info("Starting scheduler...")
        
        # Schedule daily updates at 6 AM
        schedule.every().day.at("06:00").do(self.daily_update)
        
        # Schedule weekly updates on Sundays at 7 AM
        schedule.every().sunday.at("07:00").do(self.weekly_update)
        
        logger.info("Scheduler configured. Waiting for scheduled jobs...")
        
        while True:
            schedule.run_pending()
            time.sleep(60)  # Check every minute
    
    def search_and_store_bills(self, query: str, congress: int = 118):
        """Search for bills and store them in the database."""
        logger.info(f"Searching for bills with query: {query}")
        
        try:
            search_results = self.scraper.search_bills(query, congress)
            bills = search_results.get('bills', [])
            logger.info(f"Found {len(bills)} bills matching query")
            
            processed = 0
            for bill in bills:
                try:
                    # Get enriched bill data
                    enriched_bill = self.scraper.get_enriched_bill_data(bill)
                    
                    # Store in database
                    if self.db.insert_bill(enriched_bill):
                        processed += 1
                        
                    time.sleep(Config.REQUEST_DELAY)
                    
                except Exception as e:
                    logger.error(f"Error processing search result bill {bill.get('number', 'unknown')}: {e}")
                    continue
            
            logger.info(f"Successfully processed {processed} bills from search")
            return processed
            
        except Exception as e:
            logger.error(f"Error during bill search: {e}")
            return 0
    
    def get_database_stats(self) -> Dict:
        """Get database statistics."""
        return self.db.get_statistics()

async def cleanup_bills_without_text():
    """Remove bills that don't have substantial text content."""
    try:
        db = DatabaseManager()
        
        # Show current stats
        logger.info("Checking for bills without text...")
        bills_without_text = db.get_bills_without_text()
        logger.info(f"Found {len(bills_without_text)} bills without substantial text")
        
        if bills_without_text:
            for bill in bills_without_text[:5]:  # Show first 5
                logger.info(f"  - {bill['bill_id']}: {bill['title'][:60]}...")
            
            # Delete them
            deleted_count = db.delete_bills_without_text()
            logger.info(f"Deleted {deleted_count} bills without text")
            
            # Show updated stats
            stats = db.get_statistics()
            logger.info(f"Updated stats: {stats['total_bills']} bills remaining")
        else:
            logger.info("No bills without text found")
            
    except Exception as e:
        logger.error(f"Error during cleanup: {e}")
        raise

def main():
    """Main entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Congress.gov API Scraper')
    parser.add_argument('--mode', choices=['initial', 'scheduler', 'daily', 'search', 'test', 'cleanup'], 
                       default='daily', help='Operation mode')
    parser.add_argument('--days', type=int, default=1, 
                       help='Number of days to scrape (for daily mode)')
    parser.add_argument('--query', type=str, 
                       help='Search query for bills (use with --mode search)')
    parser.add_argument('--stats', action='store_true', 
                       help='Show database statistics')
    
    args = parser.parse_args()
    
    try:
        Config.validate()
        app = CongressScraperApp()
        
        if args.stats:
            stats = app.get_database_stats()
            print("Database Statistics:")
            for key, value in stats.items():
                print(f"  {key}: {value}")
            return
        
        if args.mode == 'initial':
            logger.info("Running initial data load...")
            app.initial_data_load()
            
        elif args.mode == 'scheduler':
            logger.info("Starting scheduler mode...")
            app.run_scheduler()
            
        elif args.mode == 'daily':
            logger.info(f"Running daily sync with notifications for last {args.days} days...")
            app.daily_update_with_notifications(days=args.days, mode='daily')
            
        elif args.mode == 'test':
            logger.info(f"Running test mode with notifications for last {args.days} days...")
            app.daily_update_with_notifications(days=args.days, mode='test')
            
        elif args.mode == 'search':
            if not args.query:
                logger.error("Search query required when using search mode")
                sys.exit(1)
            app.search_and_store_bills(args.query)

        elif args.mode == 'cleanup':
            asyncio.run(cleanup_bills_without_text())
        
        logger.info("Operation completed successfully")
        
    except Exception as e:
        logger.error(f"Application error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 
#!/usr/bin/env python3
"""
Notification utilities for the scraper
Handles Discord webhook notifications for scraper events
"""

import os
import json
import requests
from datetime import datetime
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

class NotificationManager:
    """Manages notifications for scraper events via Discord webhooks"""
    
    def __init__(self):
        self.discord_webhook = os.getenv('DISCORD_WEBHOOK_URL')
        self.enabled = bool(self.discord_webhook)
        
        if not self.enabled:
            logger.info("Discord webhook not configured - notifications disabled")
        else:
            logger.info("Discord webhook configured - notifications enabled")
    
    def send_success_notification(self, stats: Dict[str, Any]):
        """Send notification for successful scraper run"""
        if not self.enabled:
            return
            
        message = self._format_success_message(stats)
        self._send_discord_notification(message)
        logger.info("Sent success notification to Discord")
    
    def send_failure_notification(self, error: str, stats: Optional[Dict[str, Any]] = None):
        """Send notification for failed scraper run"""
        if not self.enabled:
            return
            
        message = self._format_failure_message(error, stats)
        self._send_discord_notification(message)
        logger.info("Sent failure notification to Discord")
    
    def send_warning_notification(self, warning: str, stats: Optional[Dict[str, Any]] = None):
        """Send notification for scraper warnings"""
        if not self.enabled:
            return
            
        message = self._format_warning_message(warning, stats)
        self._send_discord_notification(message)
        logger.info("Sent warning notification to Discord")
    
    def send_start_notification(self, mode: str, days: int):
        """Send notification when scraper starts"""
        if not self.enabled:
            return
            
        message = {
            "content": "🚀 **Daily Bill Scraper Starting**",
            "embeds": [
                {
                    "title": "Scraper Started",
                    "color": 3447003,  # Blue
                    "fields": [
                        {
                            "name": "Mode",
                            "value": mode
                        },
                        {
                            "name": "Days Back",
                            "value": str(days)
                        },
                        {
                            "name": "Time",
                            "value": datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC")
                        }
                    ],
                    "timestamp": datetime.utcnow().isoformat()
                }
            ]
        }
        
        self._send_discord_notification(message)
        logger.info("Sent start notification to Discord")
    
    def _format_success_message(self, stats: Dict[str, Any]) -> Dict[str, Any]:
        """Format success message for Discord"""
        duration_str = f"{stats.get('duration_seconds', 0):.1f}s"
        if stats.get('duration_seconds', 0) > 60:
            minutes = stats.get('duration_seconds', 0) / 60
            duration_str = f"{minutes:.1f}m"
        
        return {
            "content": "✅ **Daily Bill Scraper Completed Successfully**",
            "embeds": [
                {
                    "title": "Scraper Statistics",
                    "color": 3066993,  # Green
                    "fields": [
                        {
                            "name": "Bills Processed",
                            "value": str(stats.get('bills_processed', 0))
                        },
                        {
                            "name": "New Bills",
                            "value": str(stats.get('new_bills', 0))
                        },
                        {
                            "name": "Updated Bills", 
                            "value": str(stats.get('updated_bills', 0))
                        },
                        {
                            "name": "Duration",
                            "value": duration_str
                        },
                        {
                            "name": "API Calls",
                            "value": str(stats.get('api_calls', 0))
                        },
                        {
                            "name": "Errors",
                            "value": str(stats.get('errors', 0))
                        }
                    ],
                    "footer": {
                        "text": f"Mode: {stats.get('mode', 'unknown')} | Days: {stats.get('days', 'unknown')}"
                    },
                    "timestamp": datetime.utcnow().isoformat()
                }
            ]
        }
    
    def _format_failure_message(self, error: str, stats: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Format failure message for Discord"""
        # Truncate error message if too long
        error_message = error[:1000] + "..." if len(error) > 1000 else error
        
        fields = [
            {
                "name": "Error",
                "value": f"```{error_message}```"
            }
        ]
        
        if stats:
            fields.extend([
                {
                    "name": "Bills Processed Before Error",
                    "value": str(stats.get('bills_processed', 0))
                },
                {
                    "name": "API Calls Made",
                    "value": str(stats.get('api_calls', 0))
                },
                {
                    "name": "Duration Before Failure",
                    "value": f"{stats.get('duration_seconds', 0):.1f}s"
                }
            ])
        
        return {
            "content": "🚨 **Daily Bill Scraper Failed**",
            "embeds": [
                {
                    "title": "Scraper Error",
                    "color": 15158332,  # Red
                    "fields": fields,
                    "footer": {
                        "text": "Check GitHub Actions logs for full details"
                    },
                    "timestamp": datetime.utcnow().isoformat()
                }
            ]
        }
    
    def _format_warning_message(self, warning: str, stats: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Format warning message for Discord"""
        # Truncate warning message if too long
        warning_message = warning[:1000] + "..." if len(warning) > 1000 else warning
        
        fields = [
            {
                "name": "Warning",
                "value": warning_message
            }
        ]
        
        if stats:
            fields.append({
                "name": "Current Progress",
                "value": f"Processed {stats.get('bills_processed', 0)} bills"
            })
        
        return {
            "content": "⚠️ **Daily Bill Scraper Warning**",
            "embeds": [
                {
                    "title": "Scraper Warning",
                    "color": 16776960,  # Yellow
                    "fields": fields,
                    "timestamp": datetime.utcnow().isoformat()
                }
            ]
        }
    
    def _send_discord_notification(self, message: Dict[str, Any]):
        """Send notification to Discord webhook"""
        if not self.discord_webhook:
            logger.warning("Discord webhook not configured, skipping notification")
            return
        
        try:
            response = requests.post(
                self.discord_webhook,
                json=message,
                timeout=10,
                headers={'Content-Type': 'application/json'}
            )
            response.raise_for_status()
            logger.debug(f"Discord notification sent successfully: {response.status_code}")
            
        except requests.exceptions.Timeout:
            logger.error("Discord notification timed out")
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to send Discord notification: {e}")
        except Exception as e:
            logger.error(f"Unexpected error sending Discord notification: {e}")

# Convenience function for quick notifications
def notify_scraper_event(event_type: str, data: Optional[Dict[str, Any]] = None):
    """
    Quick notification function for scraper events
    
    Args:
        event_type: 'start', 'success', 'failure', 'warning'
        data: Event-specific data
    """
    notifier = NotificationManager()
    event_data = data or {}
    
    if event_type == 'start':
        notifier.send_start_notification(
            event_data.get('mode', 'unknown'),
            event_data.get('days', 1)
        )
    elif event_type == 'success':
        notifier.send_success_notification(event_data)
    elif event_type == 'failure':
        notifier.send_failure_notification(
            event_data.get('error', 'Unknown error'),
            event_data.get('stats')
        )
    elif event_type == 'warning':
        notifier.send_warning_notification(
            event_data.get('warning', 'Unknown warning'),
            event_data.get('stats')
        )
    else:
        logger.error(f"Unknown notification event type: {event_type}") 
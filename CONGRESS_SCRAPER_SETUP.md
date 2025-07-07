# 📋 Congress Scraper Setup Guide

## 🚀 Quick Start

Your Congress.gov API scraper is now integrated! Follow these steps to get it running:

### 1. Get Your Congress.gov API Key
1. Go to https://api.data.gov/signup
2. Sign up for a free account
3. Get your API key

### 2. Add to Your Root .env File
Add these variables to your existing `.env` file in the project root:
```bash
# Congress.gov API Configuration
CONGRESS_API_KEY=your_api_key_here
CONGRESS_API_BASE_URL=https://api.congress.gov/v3/

# Your existing Supabase variables should already be here:
# SUPABASE_URL=https://your-project.supabase.co
# SUPABASE_KEY=your_supabase_anon_key
# SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Install Python Dependencies
```bash
# Install Python packages
npm run scraper:install

# Alternative: manual installation
cd backend
pip install -r requirements.txt
```

### 4. Apply Database Migrations
```bash
# Apply the scraper tables to your Supabase database
npm run db:push
```

### 5. Test the Setup
```bash
# Test with database stats
npm run scraper:stats

# Or run a small test scrape
npm run scraper:daily 1
```

## 🖥️ Manual Scraping Interface

### Access the Scraper Page
Visit: `http://localhost:3000/scraper`

### Features Available:
- **Download Last 30 Days**: Scrapes all bills introduced in the last 30 days
- **Database Statistics**: Shows current data counts
- **Progress Tracking**: Real-time scraping progress
- **Error Handling**: Clear error messages and logging

### What Gets Scraped:
- ✅ **Bills**: Title, sponsor, introduction date, latest action
- ✅ **Actions**: All legislative actions taken on each bill
- ✅ **Cosponsors**: All cosponsors who signed onto bills
- ✅ **Subjects**: Policy areas and topics for each bill
- ✅ **Summaries**: Official bill summaries when available
- ✅ **Metadata**: Congress number, bill type, chamber of origin

## 📊 Database Schema

The scraper creates these tables in your Supabase:

### Primary Tables:
- `bills` - Main bill information
- `members` - Congress members
- `committees` - Congressional committees

### Related Tables:
- `bill_actions` - Legislative actions
- `bill_cosponsors` - Bill cosponsors
- `bill_subjects` - Policy topics
- `bill_summaries` - Official summaries

## 🛠️ CLI Commands

### Available Commands:
```bash
# Show help
npm run scraper:help

# Run initial data load (last 90 days)
npm run scraper:initial

# Daily sync (default: 30 days)
npm run scraper:daily

# Search for specific bills
npm run scraper:search "climate change"

# Get database statistics
npm run scraper:stats

# Start continuous scheduler
npm run scraper:scheduler
```

### Direct Python Usage:
```bash
cd backend
python -m scraper.main --help
python -m scraper.main --mode daily --days 30
python -m scraper.main --mode search --query "infrastructure"
```

## 🔧 Configuration Options

### Environment Variables:
```bash
# API Configuration
CONGRESS_API_KEY=your_key_here
CONGRESS_API_BASE_URL=https://api.congress.gov/v3/

# Rate Limiting
MAX_RETRIES=3
REQUEST_DELAY=1
BATCH_SIZE=100

# Logging
LOG_LEVEL=INFO
```

### API Rate Limits:
- **Default**: 1 second delay between requests
- **Respectful**: Follows Congress.gov guidelines
- **Retry Logic**: Exponential backoff on failures

## 🚨 Troubleshooting

### Common Issues:

#### 1. "Python not found"
```bash
# Windows
npm config set script-shell "C:\\Program Files\\Git\\bin\\bash.exe"

# Or use specific Python path
python3 -m scraper.main --help
```

#### 2. "Missing dependencies"
```bash
# Reinstall Python packages
cd backend
pip install -r requirements.txt --force-reinstall
```

#### 3. "Database connection failed"
- Check your Supabase credentials in your root `.env` file
- Ensure Row Level Security policies are correctly set
- Verify the migration was applied: `npm run db:push`

#### 4. "API key invalid"
- Verify your Congress.gov API key at https://api.data.gov
- Check that the key is correctly set in your root `.env` file
- Ensure no extra spaces or quotes around the key

## 📈 Performance Notes

### Scraping Speed:
- **30 days**: ~5-10 minutes (depending on activity)
- **90 days**: ~15-30 minutes
- **Rate limited**: 1 request per second (respectful to Congress.gov)

### Database Storage:
- **Typical 30 days**: ~500-1000 bills
- **Full metadata**: ~10-20MB per month
- **Efficient**: Deduplicated and indexed

## 🔄 Automation Options

### Scheduled Scraping:
```bash
# Run continuous scheduler (daily + weekly updates)
npm run scraper:scheduler
```

### Custom Scheduling:
- **Daily**: Last 3 days at 6 AM
- **Weekly**: Last 7 days + members on Sundays at 7 AM
- **Customizable**: Edit `backend/scraper/main.py`

## 📖 API Integration

### Next.js API Routes:
```javascript
// GET /api/scraper - Get statistics
const stats = await fetch('/api/scraper');

// POST /api/scraper - Run scraper
const result = await fetch('/api/scraper', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    command: 'daily',
    options: { days: 30 }
  })
});
```

### Available Commands:
- `initial` - First-time setup scrape
- `daily` - Regular daily scrape
- `search` - Search by query
- `stats` - Database statistics

## 🎯 Next Steps

1. **Test the setup** with a small scrape
2. **Visit `/scraper`** to use the web interface
3. **Set up automation** if needed
4. **Monitor logs** in `congress_scraper.log`

## 📞 Support

If you encounter issues:
1. Check the logs in `congress_scraper.log`
2. Verify your API key and database credentials in your root `.env` file
3. Test with a small scrape first (`npm run scraper:daily 1`)
4. Check the GitHub issues for known problems

## 🎉 Success!

Once setup is complete, you'll have:
- ✅ **Automated** congressional data collection
- ✅ **Real-time** bill tracking
- ✅ **Comprehensive** metadata
- ✅ **Scalable** architecture for your political analysis platform

Your scraper is now ready to collect congressional data for your Polisee application! 
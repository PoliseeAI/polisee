# AI Bill Summaries - Batch Processing System

This system allows you to generate AI summaries for all bills in the database at once, rather than generating them one by one when users visit bill pages.

## Overview

The batch processing system consists of:
1. **API endpoint** (`/api/batch-summaries`) - Handles the batch processing logic
2. **CLI script** (`scripts/batch-summaries.js`) - Command-line interface for batch processing
3. **Admin UI** (in `/scraper` page) - Web interface for admins to manage batch processing

## Features

- ✅ **Batch Processing**: Generate summaries for all bills at once
- ✅ **Smart Caching**: Skip bills that already have summaries (unless forced to regenerate)
- ✅ **Progress Tracking**: Real-time status updates and detailed results
- ✅ **Error Handling**: Graceful handling of failed API calls with detailed error reporting
- ✅ **Rate Limiting**: Built-in delays to respect OpenAI API rate limits
- ✅ **Resume Capability**: Can resume from where it left off (skips existing summaries)

## Prerequisites

1. **Environment Variables**: Create a `.env` or `.env.local` file in your project root with:
   ```bash
   # Required for AI summaries
   OPENAI_API_KEY=your_openai_api_key
   
   # Required for batch processing (admin access)
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   
   # Your existing Supabase config
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

2. **Bills Data**: Make sure you have bills with text content in your database
3. **Dependencies**: Run `npm install` to install required packages

### 🔑 **Getting Your Supabase Service Role Key**
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** > **API**
4. Copy the **service_role** key (not the anon key)
5. Add it as `SUPABASE_SERVICE_ROLE_KEY` in your `.env` file

## Usage Methods

### 1. Admin Web Interface (Recommended)

1. Navigate to `/scraper` page in your application
2. Scroll to the "AI Bill Summaries" section
3. View current status (total bills, existing summaries, completion rate)
4. Click "Generate Missing Summaries" to process only bills without summaries
5. Click "Regenerate All" to force regeneration of all summaries

### 2. Command Line Interface

```bash
# Check current status
npm run ai:batch-status

# Generate summaries for bills that don't have them
npm run ai:batch-summaries

# Force regenerate all summaries
npm run ai:batch-force

# Advanced options
node scripts/batch-summaries.js --help
```

### 3. Direct API Calls

```javascript
// Get status
GET /api/batch-summaries

// Start batch processing
POST /api/batch-summaries
{
  "forceRegenerate": false,
  "maxBills": 50,
  "skipExisting": true
}
```

## CLI Script Options

```bash
node scripts/batch-summaries.js [options]

Options:
  --force-regenerate    Regenerate summaries even if they already exist
  --max-bills <number>  Maximum number of bills to process (default: 50)
  --skip-existing       Skip bills that already have summaries (default: true)
  --no-skip-existing    Process all bills regardless of existing summaries
  --status-only         Only show status without processing
  --help               Show help message
```

## How It Works

1. **Fetches Bills**: Gets all active bills with text content from the database
2. **Checks Cache**: Uses SHA-256 hash of bill text to determine if summary needs regeneration
3. **Processes Bills**: Sends bill text to OpenAI API for summary generation
4. **Saves Results**: Stores generated summaries in `ai_bill_summaries` table
5. **Error Handling**: Tracks and reports any failures

## API Response Format

### Status Response (GET)
```json
{
  "success": true,
  "totalBills": 25,
  "existingSummaries": 10,
  "billsWithoutSummaries": 15,
  "completionRate": 40
}
```

### Batch Processing Response (POST)
```json
{
  "success": true,
  "processed": 15,
  "skipped": 10,
  "failed": 0,
  "errors": [],
  "message": "Batch processing complete. Processed: 15, Skipped: 10, Failed: 0",
  "details": {
    "totalBills": 25,
    "existingSummaries": 10,
    "billsToProcess": 15
  }
}
```

## Database Schema

The summaries are stored in the `ai_bill_summaries` table:

```sql
CREATE TABLE ai_bill_summaries (
    id SERIAL PRIMARY KEY,
    bill_id VARCHAR(50) NOT NULL,
    what_it_does TEXT NOT NULL,
    key_changes TEXT[] NOT NULL,
    who_it_affects TEXT[] NOT NULL,
    fiscal_impact TEXT NOT NULL,
    timeline TEXT NOT NULL,
    model_used VARCHAR(100) NOT NULL DEFAULT 'gpt-4o-mini',
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    bill_text_hash VARCHAR(64) NOT NULL,
    UNIQUE(bill_id)
);
```

## Rate Limiting

The system includes built-in rate limiting:
- 1 second delay between API calls
- Maximum 200 bills per batch (configurable)
- Respects OpenAI API rate limits

## Error Handling

The system handles various error scenarios:
- ❌ OpenAI API errors (rate limits, invalid responses)
- ❌ Database connection issues
- ❌ Missing bill text or titles
- ❌ JSON parsing errors
- ❌ Network timeouts

All errors are logged and reported in the response for debugging.

## Best Practices

1. **Start Small**: Begin with a small batch (`--max-bills 10`) to test
2. **Monitor Progress**: Use the web interface to track progress
3. **Check Status First**: Always check status before running batch processing
4. **Handle Errors**: Review error messages and retry failed bills individually
5. **Use Force Regenerate Sparingly**: Only use when you need to update existing summaries

## Troubleshooting

### Common Issues

1. **"OpenAI API key not configured"**
   - Add `OPENAI_API_KEY=your_key` to your `.env` file
   - Restart your development server

2. **"No bills found with content"**
   - Run the congress scraper first to populate bills
   - Check that bills have actual text content (not "[No text content available]")

3. **Rate limit errors**
   - The system has built-in delays, but you may need to wait if you hit limits
   - OpenAI has different rate limits for different tiers

4. **Database connection errors**
   - Check your Supabase connection
   - Verify the `ai_bill_summaries` table exists

5. **"new row violates row-level security policy" error**
   - This means you're missing the `SUPABASE_SERVICE_ROLE_KEY` environment variable
   - Get the service role key from your Supabase Dashboard > Settings > API
   - Add it to your `.env` file and restart your server

### Debugging

1. Check the browser developer console for detailed error messages
2. Look at the server logs for API call details
3. Use `--status-only` to check current state without processing
4. Test with a single bill first using the individual summary API

## Performance

- **Processing Time**: ~2-3 seconds per bill (including API call + delay)
- **Batch Size**: Default 50 bills per batch (about 2-3 minutes)
- **Memory Usage**: Low - processes bills one at a time
- **API Costs**: Approximately $0.01-0.02 per bill summary

## Future Enhancements

- [ ] Background job processing for large batches
- [ ] Email notifications when batch processing completes
- [ ] Summary quality scoring and validation
- [ ] Support for different AI models
- [ ] Scheduled automatic processing

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review the error messages in the admin interface
3. Check the browser console and server logs
4. Verify your OpenAI API key and rate limits

---

**Note**: This system is designed for admin use and should be used responsibly to avoid unnecessary API costs and rate limit issues. 
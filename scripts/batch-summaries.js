#!/usr/bin/env node

/**
 * Batch AI Summary Generation Script
 * 
 * This script processes all bills in the database and generates AI summaries
 * for those that don't have them yet.
 * 
 * Usage:
 *   node scripts/batch-summaries.js [options]
 * 
 * Options:
 *   --force-regenerate    Regenerate summaries even if they already exist
 *   --max-bills <number>  Maximum number of bills to process (default: 50)
 *   --skip-existing       Skip bills that already have summaries (default: true)
 *   --status-only         Only show status without processing
 *   --help               Show this help message
 */

const { Command } = require('commander');

const program = new Command();

program
  .name('batch-summaries')
  .description('Generate AI summaries for bills in batch')
  .option('--force-regenerate', 'Regenerate summaries even if they already exist', false)
  .option('--max-bills <number>', 'Maximum number of bills to process', parseInt, 200)
  .option('--skip-existing', 'Skip bills that already have summaries', true)
  .option('--no-skip-existing', 'Process all bills regardless of existing summaries')
  .option('--status-only', 'Only show status without processing', false)
  .option('--help', 'Show help message')
  .parse();

const options = program.opts();

if (options.help) {
  program.help();
  process.exit(0);
}

const API_BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const BATCH_ENDPOINT = `${API_BASE_URL}/api/batch-summaries`;

// Dynamic import for node-fetch
async function getFetch() {
  const { default: fetch } = await import('node-fetch');
  return fetch;
}

async function getStatus() {
  try {
    console.log('🔍 Checking current status...\n');
    
    const fetch = await getFetch();
    const response = await fetch(BATCH_ENDPOINT, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.success) {
      console.log('📊 Current Status:');
      console.log(`   Total Bills: ${data.totalBills}`);
      console.log(`   Existing Summaries: ${data.existingSummaries}`);
      console.log(`   Bills Without Summaries: ${data.billsWithoutSummaries}`);
      console.log(`   Completion Rate: ${data.completionRate}%`);
      console.log('');
      
      return data;
    } else {
      console.error('❌ Failed to get status:', data.message);
      return null;
    }
  } catch (error) {
    console.error('❌ Error getting status:', error.message);
    return null;
  }
}

async function runBatchProcessing() {
  try {
    console.log('🚀 Starting batch AI summary generation...\n');
    
    const requestBody = {
      forceRegenerate: options.forceRegenerate,
      maxBills: options.maxBills,
      skipExisting: options.skipExisting
    };
    
    console.log('⚙️  Configuration:');
    console.log(`   Force Regenerate: ${requestBody.forceRegenerate}`);
    console.log(`   Max Bills: ${requestBody.maxBills}`);
    console.log(`   Skip Existing: ${requestBody.skipExisting}`);
    console.log('');
    
    const fetch = await getFetch();
    const response = await fetch(BATCH_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Batch processing completed successfully!\n');
      
      console.log('📊 Results:');
      console.log(`   Total Bills Found: ${data.details.totalBills}`);
      console.log(`   Existing Summaries: ${data.details.existingSummaries}`);
      console.log(`   Bills Processed: ${data.processed}`);
      console.log(`   Bills Skipped: ${data.skipped}`);
      console.log(`   Bills Failed: ${data.failed}`);
      console.log('');
      
      if (data.errors.length > 0) {
        console.log('⚠️  Errors encountered:');
        data.errors.forEach((error, index) => {
          console.log(`   ${index + 1}. ${error}`);
        });
        console.log('');
      }
      
      console.log(`💬 ${data.message}`);
      
      return data;
    } else {
      console.error('❌ Batch processing failed:', data.message);
      return null;
    }
  } catch (error) {
    console.error('❌ Error during batch processing:', error.message);
    return null;
  }
}

async function main() {
  console.log('🤖 AI Bill Summary Batch Processor\n');
  
  // Always show status first
  const status = await getStatus();
  
  if (!status) {
    console.log('❌ Could not retrieve status. Please check your server is running.');
    process.exit(1);
  }
  
  // If status-only flag is set, exit after showing status
  if (options.statusOnly) {
    console.log('ℹ️  Status-only mode. Exiting without processing.');
    process.exit(0);
  }
  
  // If no bills need processing, ask user
  if (status.billsWithoutSummaries === 0 && !options.forceRegenerate) {
    console.log('✅ All bills already have summaries!');
    console.log('   Use --force-regenerate to regenerate existing summaries.');
    process.exit(0);
  }
  
  // Show what will be processed
  if (options.forceRegenerate) {
    console.log(`🔄 Will regenerate summaries for up to ${options.maxBills} bills`);
  } else {
    console.log(`📝 Will generate summaries for ${Math.min(status.billsWithoutSummaries, options.maxBills)} bills`);
  }
  
  // Ask for confirmation in interactive mode
  if (process.stdin.isTTY && !process.env.CI) {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise((resolve) => {
      rl.question('\n❓ Do you want to proceed? (y/N): ', (answer) => {
        rl.close();
        resolve(answer.toLowerCase());
      });
    });
    
    if (answer !== 'y' && answer !== 'yes') {
      console.log('👋 Operation cancelled.');
      process.exit(0);
    }
  }
  
  // Run the batch processing
  const result = await runBatchProcessing();
  
  if (result) {
    console.log('\n🎉 Batch processing completed!');
    
    if (result.failed > 0) {
      console.log(`⚠️  ${result.failed} bills failed to process. Check the logs above for details.`);
      process.exit(1);
    }
  } else {
    console.log('\n❌ Batch processing failed. Check the error messages above.');
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Run the main function
main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
}); 
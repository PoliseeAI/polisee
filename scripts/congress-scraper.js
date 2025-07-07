#!/usr/bin/env node
/**
 * Congress Scraper CLI Interface
 * Node.js wrapper to call the Python scraper with various commands
 */

const { spawn } = require('child_process');
const path = require('path');

// Python executable path (adjust for your system)
const PYTHON_EXE = process.platform === 'win32' ? 'python' : 'python3';
const SCRAPER_PATH = path.join(__dirname, '..', 'backend', 'scraper', 'main.py');

/**
 * Execute Python scraper with arguments
 * @param {Array} args - Python arguments
 * @returns {Promise}
 */
function runPythonScraper(args) {
    return new Promise((resolve, reject) => {
        const pythonProcess = spawn(PYTHON_EXE, [SCRAPER_PATH, ...args], {
            stdio: 'inherit',
            cwd: path.join(__dirname, '..'), // Run from project root to access .env file
            env: { ...process.env, PYTHONPATH: path.join(__dirname, '..', 'backend') }
        });

        pythonProcess.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`Python scraper exited with code ${code}`));
            }
        });

        pythonProcess.on('error', (error) => {
            reject(error);
        });
    });
}

/**
 * Show help information
 */
function showHelp() {
    console.log(`
Congress Scraper CLI

Usage: node scripts/congress-scraper.js [command] [options]

Commands:
  initial              Run initial data load (last 90 days)
  daily [days]         Run daily sync (default: 30 days)
  test [limit]         Quick test mode (default: 20 bills)
  scheduler            Start continuous scheduler
  search <query>       Search and download bills by query
  stats                Show database statistics
  help                 Show this help message

Examples:
  node scripts/congress-scraper.js initial
  node scripts/congress-scraper.js daily 7
  node scripts/congress-scraper.js test 10
  node scripts/congress-scraper.js search "climate change"
  node scripts/congress-scraper.js stats
  node scripts/congress-scraper.js scheduler

Environment Setup:
  1. Copy backend/env.template to backend/.env
  2. Fill in your Congress.gov API key and Supabase credentials
  3. Run: npm run scraper:install
  4. Run: npm run db:push (to apply migrations)
    `);
}

/**
 * Main CLI function
 */
async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0 || args[0] === 'help') {
        showHelp();
        return;
    }

    const command = args[0];
    const options = args.slice(1);

    try {
        switch (command) {
            case 'initial':
                console.log('🚀 Running initial data load...');
                await runPythonScraper(['--mode', 'initial']);
                console.log('✅ Initial data load completed!');
                break;

            case 'daily':
                const days = options[0] || '30';
                console.log(`🔄 Running daily sync for last ${days} days...`);
                await runPythonScraper(['--mode', 'daily', '--days', days]);
                console.log('✅ Daily sync completed!');
                break;

            case 'test':
                const limit = options[0] || '20';
                console.log(`🧪 Running test mode with ${limit} bills...`);
                await runPythonScraper(['--mode', 'test', '--limit', limit]);
                console.log('✅ Test completed!');
                break;

            case 'scheduler':
                console.log('⏰ Starting continuous scheduler...');
                console.log('Press Ctrl+C to stop');
                await runPythonScraper(['--mode', 'scheduler']);
                break;

            case 'search':
                if (options.length === 0) {
                    console.error('❌ Error: Search query required');
                    console.log('Usage: node scripts/congress-scraper.js search "your query"');
                    process.exit(1);
                }
                const query = options.join(' ');
                console.log(`🔍 Searching for bills: "${query}"...`);
                await runPythonScraper(['--mode', 'search', '--query', query]);
                console.log('✅ Search completed!');
                break;

            case 'stats':
                console.log('📊 Fetching database statistics...');
                await runPythonScraper(['--stats']);
                break;

            default:
                console.error(`❌ Unknown command: ${command}`);
                console.log('Run "node scripts/congress-scraper.js help" for usage information');
                process.exit(1);
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { runPythonScraper, showHelp }; 
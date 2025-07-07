import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

// Python executable path (adjust for your system)
const PYTHON_EXE = process.platform === 'win32' ? 'python' : 'python3';
const SCRAPER_PATH = path.join(process.cwd(), 'backend', 'scraper', 'main.py');

/**
 * Execute Python scraper with arguments
 */
function runPythonScraper(args: string[]): Promise<{ stdout: string; stderr: string; code: number }> {
    return new Promise((resolve, reject) => {
        const pythonProcess = spawn(PYTHON_EXE, [SCRAPER_PATH, ...args], {
            cwd: process.cwd(), // Run from project root to access .env file
            env: { ...process.env, PYTHONPATH: path.join(process.cwd(), 'backend') }
        });

        let stdout = '';
        let stderr = '';

        pythonProcess.stdout?.on('data', (data: Buffer) => {
            stdout += data.toString();
        });

        pythonProcess.stderr?.on('data', (data: Buffer) => {
            stderr += data.toString();
        });

        pythonProcess.on('close', (code) => {
            resolve({ stdout, stderr, code: code || 0 });
        });

        pythonProcess.on('error', (error) => {
            reject(error);
        });
    });
}

/**
 * GET /api/scraper - Get scraper status and statistics
 */
export async function GET() {
    try {
        const result = await runPythonScraper(['--stats']);
        
        if (result.code === 0) {
            return NextResponse.json({
                success: true,
                data: result.stdout,
                message: 'Statistics retrieved successfully'
            });
        } else {
            return NextResponse.json({
                success: false,
                error: result.stderr || 'Failed to get statistics',
                code: result.code
            }, { status: 500 });
        }
    } catch (error) {
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}

/**
 * POST /api/scraper - Execute scraper commands
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { command, options = {} } = body;

        if (!command || typeof command !== 'string') {
            return NextResponse.json({
                success: false,
                error: 'Command is required and must be a string'
            }, { status: 400 });
        }

        let args: string[] = [];

        switch (command) {
            case 'initial':
                args = ['--mode', 'initial'];
                break;
            case 'daily':
                args = ['--mode', 'daily'];
                if (options.days) {
                    args.push('--days', options.days.toString());
                }
                break;
            case 'search':
                if (!options.query) {
                    return NextResponse.json({
                        success: false,
                        error: 'Query is required for search command'
                    }, { status: 400 });
                }
                args = ['--mode', 'search', '--query', options.query];
                break;
            case 'stats':
                args = ['--stats'];
                break;
            default:
                return NextResponse.json({
                    success: false,
                    error: `Unknown command: ${command}`
                }, { status: 400 });
        }

        const result = await runPythonScraper(args);
        
        if (result.code === 0) {
            return NextResponse.json({
                success: true,
                data: result.stdout,
                message: `${command} command executed successfully`
            });
        } else {
            return NextResponse.json({
                success: false,
                error: result.stderr || `Failed to execute ${command} command`,
                code: result.code
            }, { status: 500 });
        }
    } catch (error) {
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
} 
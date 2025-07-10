// src/app/api/web-search/route.ts
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { query } = await request.json()

  if (!query) {
    return NextResponse.json({ error: 'Search query is required' }, { status: 400 })
  }

  // IMPORTANT: Add SERPER_API_KEY to your .env.local file
  const SERPER_API_KEY = process.env.SERPER_API_KEY

  if (!SERPER_API_KEY) {
    console.error('SERPER_API_KEY is not configured in .env.local');
    // For this demo, we will return empty results instead of failing.
    // In a real production app, you might want to throw an error.
    return NextResponse.json({ results: [] });
  }

  try {
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': SERPER_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ q: query, num: 5 }), // Get top 5 results
    })

    if (!response.ok) {
      console.error('Web search API failed with status:', response.status);
      return NextResponse.json({ results: [] }); // Return empty on failure
    }

    const data = await response.json();
    // We only need a clean list of snippets for context
    const snippets = data.organic
        .map((result: any) => result.snippet)
        .filter(Boolean); // Filter out any null/undefined snippets

    return NextResponse.json({ results: snippets })
  } catch (error: any) {
    console.error('Error during web search:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}
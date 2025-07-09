import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    console.log('=== Search Bills API Called ===')
    const { persona } = await request.json()
    console.log('Received persona:', persona)

    // Validate required fields
    if (!persona) {
      console.log('Error: Missing persona field')
      return NextResponse.json(
        { error: 'Missing required field: persona' },
        { status: 400 }
      )
    }

    // Make the request to the external API
    console.log('Making request to external API...')
    const response = await fetch('https://bill-search.fly.dev/search_bills', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer b9cc27096a884ca0937b15a364f48ff4',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        persona: persona
      })
    })

    console.log('External API response status:', response.status)
    console.log('External API response statusText:', response.statusText)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Bill search API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      })
      return NextResponse.json(
        { error: `Bill search API error: ${response.status} - ${errorText}` },
        { status: 500 }
      )
    }

    const results = await response.json()
    console.log('External API results:', results)
    console.log('Number of results:', results?.length || 0)
    
    return NextResponse.json(results)

  } catch (error) {
    console.error('Error in search-bills API:', error)
    return NextResponse.json(
      { error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    )
  }
} 
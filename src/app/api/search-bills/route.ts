import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    console.log('=== Search Bills API Called ===')
    const { query } = await request.json()
    console.log('Received query:', query)

    // Validate required fields
    if (!query) {
      console.log('Error: Missing query field')
      return NextResponse.json(
        { error: 'Missing required field: query' },
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
        query: query  // The external API expects "query"
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
    
    // Transform the results to include the proper bill_id
    if (results && results.length > 0) {
      // Extract the primary key IDs from the results
      const primaryKeyIds = results.map((result: any) => result.bill_id)
      
      // Look up the formatted bill_ids from the database
      const { data: billsData, error } = await supabase
        .from('bills')
        .select('id, bill_id')
        .in('id', primaryKeyIds)
      
      if (error) {
        console.error('Error looking up bill IDs:', error)
        // Return original results if lookup fails
        return NextResponse.json(results)
      }
      
      // Create a mapping from primary key ID to formatted bill_id
      const idMapping = new Map()
      billsData?.forEach((bill: any) => {
        idMapping.set(bill.id, bill.bill_id)
      })
      
      // Transform the results to use the formatted bill_id
      const transformedResults = results.map((result: any) => ({
        ...result,
        bill_id: idMapping.get(result.bill_id) || result.bill_id // Use formatted ID or fall back to original
      }))
      
      console.log('Transformed results with proper bill_ids:', transformedResults)
      return NextResponse.json(transformedResults)
    }
    
    return NextResponse.json(results)

  } catch (error) {
    console.error('Error in search-bills API:', error)
    return NextResponse.json(
      { error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    )
  }
} 
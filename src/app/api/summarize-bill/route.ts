import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { Database } from '@/types/database'
import { createHash } from 'crypto'

interface BillSummaryResponse {
  summary: {
    what_it_does: string
    key_changes: string[]
    who_it_affects: string[]
    fiscal_impact: string
    timeline: string
  }
  cached?: boolean
}

type AISummaryRow = Database['public']['Tables']['ai_bill_summaries']['Row']

export async function POST(request: NextRequest) {
  try {
    const { billId, billText, billTitle } = await request.json()

    // Validate required fields
    if (!billId || !billText || !billTitle) {
      return NextResponse.json(
        { error: 'Missing required fields: billId, billText, or billTitle' },
        { status: 400 }
      )
    }

    // Use existing Supabase client

    // Generate hash of bill text to check if summary needs regeneration
    const billTextHash = createHash('sha256').update(billText).digest('hex')

    // Check if we already have a cached summary for this bill
    const { data: cachedSummary, error: cacheError } = await supabase
      .from('ai_bill_summaries')
      .select('*')
      .eq('bill_id', billId)
      .eq('bill_text_hash', billTextHash)
      .single()

    if (cacheError && cacheError.code !== 'PGRST116') {
      console.error('Error checking cached summary:', cacheError)
      // Continue with generation if cache check fails
    }

    // If we have a cached summary with the same text hash, return it
    if (cachedSummary && !cacheError) {
      return NextResponse.json({
        summary: {
          what_it_does: cachedSummary.what_it_does,
          key_changes: cachedSummary.key_changes,
          who_it_affects: cachedSummary.who_it_affects,
          fiscal_impact: cachedSummary.fiscal_impact,
          timeline: cachedSummary.timeline,
        },
        cached: true
      })
    }

    // Check if OpenAI API key is available
    const apiKey = process.env.OPENAI_API_KEY
    
    if (!apiKey) {
      console.error('OpenAI API key not configured')
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    // Create analysis prompt
    const prompt = createSummaryPrompt(billText, billTitle)
    
    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert legislative analyst who creates clear, concise summaries of bills. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1500,
        temperature: 0.2
      })
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('OpenAI API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      })
      return NextResponse.json(
        { error: `OpenAI API error: ${response.status} - ${errorText}` },
        { status: 500 }
      )
    }
    
    const result = await response.json()
    const content = result.choices[0]?.message?.content
    
    if (!content) {
      console.error('No content in AI response:', result)
      return NextResponse.json(
        { error: 'No content in AI response' },
        { status: 500 }
      )
    }
    
    try {
      const summaryResult: BillSummaryResponse = JSON.parse(content)
      
      // Save the generated summary to the database
      const { error: saveError } = await supabase
        .from('ai_bill_summaries')
        .upsert({
          bill_id: billId,
          bill_text_hash: billTextHash,
          what_it_does: summaryResult.summary.what_it_does,
          key_changes: summaryResult.summary.key_changes,
          who_it_affects: summaryResult.summary.who_it_affects,
          fiscal_impact: summaryResult.summary.fiscal_impact,
          timeline: summaryResult.summary.timeline,
          model_used: 'gpt-4o-mini'
        }, {
          onConflict: 'bill_id'
        })
      
      if (saveError) {
        console.error('Error saving summary to database:', saveError)
        // Continue and return the summary even if saving fails
      }
      
      return NextResponse.json({
        ...summaryResult,
        cached: false
      })
    } catch (parseError) {
      console.error('Failed to parse AI response:', content)
      return NextResponse.json(
        { error: 'Invalid JSON response from AI' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Error in summarize-bill API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function createSummaryPrompt(billText: string, billTitle: string): string {
  return `
You are an expert legislative analyst. Create a clear, concise summary of this bill.

BILL TITLE: ${billTitle}

BILL TEXT (first 4000 characters):
${billText.substring(0, 4000)}...

TASK: Create a comprehensive but easy-to-understand summary of what this bill does. Focus on:

1. WHAT IT DOES: Main purpose and goals in plain English
2. KEY CHANGES: Specific changes, new programs, or modifications being made
3. WHO IT AFFECTS: Groups of people, industries, or entities that would be impacted
4. FISCAL IMPACT: Financial implications (costs, savings, funding amounts)
5. TIMELINE: When changes would take effect

Write for a general audience - avoid legal jargon and use clear, accessible language.

Return ONLY valid JSON in this exact format:
{
  "summary": {
    "what_it_does": "Clear explanation of the bill's main purpose and goals in 2-3 sentences",
    "key_changes": [
      "First major change or provision",
      "Second major change or provision", 
      "Third major change or provision",
      "Fourth major change or provision"
    ],
    "who_it_affects": [
      "First group affected (e.g., 'Small business owners')",
      "Second group affected (e.g., 'Medicare beneficiaries')",
      "Third group affected (e.g., 'Public school students')"
    ],
    "fiscal_impact": "Description of financial impact, costs, or funding amounts mentioned in the bill",
    "timeline": "When the bill's provisions would take effect"
  }
}

IMPORTANT: 
- Only include information that is actually in the bill text
- Use simple, clear language that anyone can understand
- Be specific about dollar amounts, dates, and eligibility when mentioned
- Focus on practical impacts rather than procedural details
`
} 
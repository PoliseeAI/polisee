import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { createHash } from 'crypto'

interface BatchSummaryRequest {
  forceRegenerate?: boolean
  maxBills?: number
  skipExisting?: boolean
}

interface BatchSummaryResponse {
  success: boolean
  processed: number
  skipped: number
  failed: number
  errors: string[]
  message: string
  details: {
    totalBills: number
    existingSummaries: number
    billsToProcess: number
  }
}

interface BillForSummary {
  id: number
  bill_id: string
  title: string | null
  text: string | null
}

export async function POST(request: NextRequest) {
  try {
    const { forceRegenerate = false, maxBills = 200, skipExisting = true }: BatchSummaryRequest = await request.json()

    console.log('Starting batch summary generation...', {
      forceRegenerate,
      maxBills,
      skipExisting
    })

    // Check if OpenAI API key is available
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        message: 'OpenAI API key not configured'
      }, { status: 500 })
    }

    // Get admin Supabase client
    const supabaseAdmin = getSupabaseAdmin()

    // Get all bills with content (select id, bill_id and other needed fields)
    const { data: bills, error: billsError } = await supabaseAdmin
      .from('bills')
      .select('id, bill_id, title, text')
      .eq('is_active', true)
      .not('text', 'is', null)
      .not('text', 'eq', '')
      .not('text', 'ilike', '%[No text content available]%')
      .order('introduced_date', { ascending: false })
      .limit(maxBills)

    if (billsError) {
      console.error('Error fetching bills:', billsError)
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch bills from database'
      }, { status: 500 })
    }

    if (!bills || bills.length === 0) {
      return NextResponse.json({
        success: true,
        processed: 0,
        skipped: 0,
        failed: 0,
        errors: [],
        message: 'No bills found with content to process',
        details: {
          totalBills: 0,
          existingSummaries: 0,
          billsToProcess: 0
        }
      })
    }

    // Get existing summaries
    const { data: existingSummaries, error: summariesError } = await supabaseAdmin
      .from('ai_bill_summaries')
      .select('bill_id, bill_text_hash')

    if (summariesError) {
      console.error('Error fetching existing summaries:', summariesError)
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch existing summaries'
      }, { status: 500 })
    }

    const existingSummaryMap = new Map(
      existingSummaries?.map(summary => [summary.bill_id, summary.bill_text_hash]) || []
    )

    // Determine which bills need processing
    const billsToProcess: BillForSummary[] = []
    let skippedCount = 0

    for (const bill of bills) {
      const billTextHash = createHash('sha256').update(bill.text || '').digest('hex')
      const existingHash = existingSummaryMap.get(bill.bill_id)

      if (skipExisting && existingHash && existingHash === billTextHash && !forceRegenerate) {
        skippedCount++
        continue
      }

      billsToProcess.push(bill)
    }

    console.log(`Processing ${billsToProcess.length} bills, skipping ${skippedCount} existing summaries`)

    // Process bills in batches
    const results: BatchSummaryResponse = {
      success: true,
      processed: 0,
      skipped: skippedCount,
      failed: 0,
      errors: [],
      message: '',
      details: {
        totalBills: bills.length,
        existingSummaries: existingSummaries?.length || 0,
        billsToProcess: billsToProcess.length
      }
    }

    // Process each bill
    for (const bill of billsToProcess) {
      try {
        console.log(`Processing bill ${bill.bill_id}: ${bill.title?.substring(0, 50)}...`)
        
        const summary = await generateBillSummary(bill, apiKey, supabaseAdmin)
        
        if (summary) {
          results.processed++
          console.log(`✅ Successfully processed ${bill.bill_id}`)
        } else {
          results.failed++
          results.errors.push(`Failed to generate summary for ${bill.bill_id}`)
          console.error(`❌ Failed to process ${bill.bill_id}`)
        }

        // Add small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000))

      } catch (error) {
        results.failed++
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        results.errors.push(`Error processing ${bill.bill_id}: ${errorMessage}`)
        console.error(`❌ Error processing ${bill.bill_id}:`, error)
      }
    }

    results.message = `Batch processing complete. Processed: ${results.processed}, Skipped: ${results.skipped}, Failed: ${results.failed}`
    
    console.log('Batch summary generation completed:', results)

    return NextResponse.json(results)

  } catch (error) {
    console.error('Error in batch summary generation:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error during batch processing'
    }, { status: 500 })
  }
}

async function generateBillSummary(bill: BillForSummary, apiKey: string, supabaseAdmin: ReturnType<typeof getSupabaseAdmin>): Promise<boolean> {
  try {
    if (!bill.text || !bill.title) {
      console.error(`Bill ${bill.bill_id} missing text or title`)
      return false
    }

    const billTextHash = createHash('sha256').update(bill.text).digest('hex')
    const prompt = createSummaryPrompt(bill.text, bill.title)

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
      console.error(`OpenAI API error for ${bill.bill_id}:`, {
        status: response.status,
        error: errorText
      })
      return false
    }

    const result = await response.json()
    const content = result.choices[0]?.message?.content

    if (!content) {
      console.error(`No content in AI response for ${bill.bill_id}`)
      return false
    }

    // Parse the JSON response
    const summaryResult = JSON.parse(content)
    
    // Save to database using both bill_id (for compatibility) and bill_table_id (new foreign key)
    const { error: saveError } = await supabaseAdmin
      .from('ai_bill_summaries')
      .upsert({
        bill_id: bill.bill_id,
        bill_table_id: bill.id,
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
      console.error(`Error saving summary for ${bill.bill_id}:`, saveError)
      return false
    }

    return true

  } catch (error) {
    console.error(`Error generating summary for ${bill.bill_id}:`, error)
    return false
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

export async function GET() {
  try {
    // Get admin Supabase client
    const supabaseAdmin = getSupabaseAdmin()
    
    // Get statistics about current summary status
    const { data: bills, error: billsError } = await supabaseAdmin
      .from('bills')
      .select('bill_id, title')
      .eq('is_active', true)
      .not('text', 'is', null)
      .not('text', 'eq', '')
      .not('text', 'ilike', '%[No text content available]%')

    if (billsError) {
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch bills'
      }, { status: 500 })
    }

    const { data: summaries, error: summariesError } = await supabaseAdmin
      .from('ai_bill_summaries')
      .select('bill_id')

    if (summariesError) {
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch summaries'
      }, { status: 500 })
    }

    const totalBills = bills?.length || 0
    const existingSummaries = summaries?.length || 0
    const billsWithoutSummaries = totalBills - existingSummaries

    return NextResponse.json({
      success: true,
      totalBills,
      existingSummaries,
      billsWithoutSummaries,
      completionRate: totalBills > 0 ? Math.round((existingSummaries / totalBills) * 100) : 0
    })

  } catch (error) {
    console.error('Error in batch summary status:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 })
  }
} 
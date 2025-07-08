import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ billId: string }> }
) {
  try {
    const { billId } = await params

    if (!billId) {
      return NextResponse.json(
        { error: 'Bill ID is required' },
        { status: 400 }
      )
    }

    // Check if we have an AI summary for this bill
    const { data: summary, error } = await supabase
      .from('ai_bill_summaries')
      .select('*')
      .eq('bill_id', billId)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching AI summary:', error)
      return NextResponse.json(
        { error: 'Failed to fetch AI summary' },
        { status: 500 }
      )
    }

    if (!summary) {
      return NextResponse.json(
        { summary: null, cached: false },
        { status: 200 }
      )
    }

    return NextResponse.json({
      summary: {
        what_it_does: summary.what_it_does,
        key_changes: summary.key_changes,
        who_it_affects: summary.who_it_affects,
        fiscal_impact: summary.fiscal_impact,
        timeline: summary.timeline,
      },
      cached: true
    })

  } catch (error) {
    console.error('Error in AI summary API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 
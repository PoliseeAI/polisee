import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // Get bills with text content analysis
    const { data: bills, error } = await supabase
      .from('bills')
      .select(`
        bill_id,
        title,
        policy_area,
        type,
        number,
        sponsor_name,
        sponsor_party,
        sponsor_state,
        is_active,
        text,
        bill_summaries(*),
        bill_subjects(*)
      `)
      .limit(20)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching bills:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const billsInfo = bills?.map(bill => ({
      bill_id: bill.bill_id,
      title: bill.title?.substring(0, 100) + '...',
      policy_area: bill.policy_area,
      type: bill.type,
      number: bill.number,
      sponsor_name: bill.sponsor_name,
      has_text: !!bill.text,
      text_length: bill.text?.length || 0,
      text_preview: bill.text?.substring(0, 200) + '...' || 'No text content',
      summaries_count: bill.bill_summaries?.length || 0,
      subjects_count: bill.bill_subjects?.length || 0,
      subjects: Array.isArray(bill.bill_subjects) ? bill.bill_subjects.map(s => s.subject_name) : []
    }))

    // Get statistics about text content
    const { data: textStats, error: statsError } = await supabase
      .from('bills')
      .select('text')
      .eq('is_active', true)

    let totalBills = 0
    let billsWithText = 0
    let billsWithoutText = 0

    if (textStats && !statsError) {
      totalBills = textStats.length
      billsWithText = textStats.filter(bill => bill.text && bill.text.trim().length > 0).length
      billsWithoutText = totalBills - billsWithText
    }

    return NextResponse.json({
      total_bills_sampled: bills?.length || 0,
      statistics: {
        total_active_bills: totalBills,
        bills_with_text: billsWithText,
        bills_without_text: billsWithoutText,
        percentage_with_text: totalBills > 0 ? ((billsWithText / totalBills) * 100).toFixed(1) : 0
      },
      sample_bills: billsInfo
    })

  } catch (error) {
    console.error('Error in debug-bills API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Add POST method to check specific bills
export async function POST(request: Request) {
  try {
    const { billIds } = await request.json()
    
    if (!billIds || !Array.isArray(billIds)) {
      return NextResponse.json({ error: 'billIds array is required' }, { status: 400 })
    }

    const { data: bills, error } = await supabase
      .from('bills')
      .select('bill_id, title, text')
      .in('bill_id', billIds)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const results = bills?.map(bill => ({
      bill_id: bill.bill_id,
      title: bill.title,
      has_text: !!bill.text,
      text_length: bill.text?.length || 0,
      text_preview: bill.text?.substring(0, 500) + '...' || 'No text content'
    }))

    return NextResponse.json({ bills: results })

  } catch (error) {
    console.error('Error checking specific bills:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 
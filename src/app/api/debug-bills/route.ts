import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Get first 5 bills with all their data
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
      .limit(5)

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
      summaries_count: bill.bill_summaries?.length || 0,
      subjects_count: bill.bill_subjects?.length || 0,
      subjects: bill.bill_subjects?.map(s => s.subject_name) || []
    }))

    return NextResponse.json({
      total_bills: bills?.length || 0,
      bills: billsInfo
    })

  } catch (error) {
    console.error('Error in debug-bills API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 
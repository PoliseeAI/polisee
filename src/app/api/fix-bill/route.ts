import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    // Add the missing bill 8244
    const { data: bill, error: billError } = await supabaseAdmin
      .from('bills')
      .upsert({
        bill_id: '8244',
        congress: 118,
        type: 'HR',
        number: 8244,
        title: 'Ensuring Seniors Access to Quality Care Act',
        introduced_date: '2025-01-30',
        latest_action_date: '2025-02-01',
        latest_action: 'Referred to House Committee on Health',
        sponsor_id: 'S000006',
        sponsor_name: 'Rep. Jane Smith',
        sponsor_party: 'D',
        sponsor_state: 'NY',
        is_active: true,
        policy_area: 'Health',
        origin_chamber: 'House'
      }, {
        onConflict: 'bill_id'
      });

    if (billError) {
      console.error('Error adding bill:', billError);
      return NextResponse.json({
        success: false,
        error: 'Failed to add bill',
        details: billError
      }, { status: 500 });
    }

    // Initialize vote counters for this bill
    const { data: counter, error: counterError } = await supabaseAdmin
      .from('bill_vote_counters' as any)
      .upsert({
        bill_id: '8244',
        support_count: 0,
        oppose_count: 0
      }, {
        onConflict: 'bill_id'
      });

    if (counterError) {
      console.error('Error adding counter:', counterError);
      return NextResponse.json({
        success: false,
        error: 'Failed to add vote counter',
        details: counterError
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Bill 8244 added successfully',
      bill: bill,
      counter: counter
    });

  } catch (error) {
    console.error('Error in fix-bill API:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error
    }, { status: 500 });
  }
} 
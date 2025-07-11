import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function GET() {
  try {
    const supabase = getSupabaseAdmin()
    
    // First, ensure we have engagement metrics for all active bills
    await initializeEngagementMetrics(supabase)
    
    // Query for popular bills based on real engagement metrics
    const { data: popularBills, error } = await supabase
      .from('bill_engagement_metrics' as any)
      .select(`
        bill_id,
        popularity_score,
        total_votes,
        support_count,
        oppose_count,
        analysis_requests,
        feedback_count,
        average_rating,
        last_activity_at
      `)
      .gt('popularity_score', 0)
      .order('popularity_score', { ascending: false })
      .limit(10)

    if (error) {
      console.error('Error fetching popular bills:', error)
      return NextResponse.json({ bills: [] })
    }

    // Get bill details separately to avoid complex joins
    const billIds = popularBills?.map((item: any) => item.bill_id) || []
    
    let billDetails: any[] = []
    if (billIds.length > 0) {
      const { data: bills, error: billsError } = await supabase
        .from('bills')
        .select(`
          bill_id,
          title,
          latest_action,
          policy_area,
          latest_action_date,
          sponsor_name,
          sponsor_party,
          introduced_date
        `)
        .in('bill_id', billIds)

      if (billsError) {
        console.error('Error fetching bill details:', billsError)
      } else {
        billDetails = bills || []
      }
    }

    // Merge the data
    const formattedBills = popularBills?.map((item: any, index: number) => {
      const billDetail = billDetails.find((bill: any) => bill.bill_id === item.bill_id)
      
      return {
        bill_id: item.bill_id,
        title: billDetail?.title || `Bill ${item.bill_id}`,
        engagement_score: Math.round(item.popularity_score || 0),
        analysis_count: item.analysis_requests || 0,
        feedback_count: item.feedback_count || 0,
        total_votes: item.total_votes || 0,
        support_count: item.support_count || 0,
        oppose_count: item.oppose_count || 0,
        average_rating: item.average_rating ? Math.round(item.average_rating * 10) / 10 : 0,
        latest_action: billDetail?.latest_action || 'Under review',
        policy_area: billDetail?.policy_area || 'General',
        sponsor_name: billDetail?.sponsor_name,
        sponsor_party: billDetail?.sponsor_party,
        introduced_date: billDetail?.introduced_date,
        last_activity: item.last_activity_at,
        rank: index + 1,
        trend: calculateTrend(item.last_activity_at, item.total_votes || 0)
      }
    }) || []

    return NextResponse.json({ 
      bills: formattedBills,
      metadata: {
        total_count: formattedBills.length,
        last_updated: new Date().toISOString(),
        calculation_method: 'dynamic_engagement_metrics'
      }
    })
  } catch (error) {
    console.error('Error in popular bills API:', error)
    
    // Return fallback message instead of hardcoded data
    return NextResponse.json({ 
      bills: [],
      error: 'Unable to load popular bills. Please try again later.',
      metadata: {
        fallback: true,
        error_time: new Date().toISOString()
      }
    })
  }
}

/**
 * Initialize engagement metrics for bills that don't have them yet
 */
async function initializeEngagementMetrics(supabase: any) {
  try {
    // Get bills that don't have engagement metrics yet
    const { data: billsWithoutMetrics, error } = await supabase
      .from('bills')
      .select('bill_id')
      .eq('is_active', true)
      .limit(50) // Process in batches to avoid timeouts

    if (error) {
      console.error('Error fetching bills without metrics:', error)
      return
    }

    if (!billsWithoutMetrics || billsWithoutMetrics.length === 0) {
      return // All bills already have metrics
    }

    // Check which bills already have metrics
    const { data: existingMetrics, error: metricsError } = await supabase
      .from('bill_engagement_metrics' as any)
      .select('bill_id')
      .in('bill_id', billsWithoutMetrics.map((b: any) => b.bill_id))

    if (metricsError) {
      console.error('Error checking existing metrics:', metricsError)
      return
    }

    const existingBillIds = new Set(existingMetrics?.map((m: any) => m.bill_id) || [])
    const billsToProcess = billsWithoutMetrics.filter((bill: any) => !existingBillIds.has(bill.bill_id))

    if (billsToProcess.length === 0) {
      return // All bills already have metrics
    }

    console.log(`Initializing engagement metrics for ${billsToProcess.length} bills`)

    // Update metrics for each bill using the database function
    for (const bill of billsToProcess) {
      try {
        const { error: updateError } = await supabase
          .rpc('update_bill_engagement_metrics', { p_bill_id: bill.bill_id })
        
        if (updateError) {
          console.error(`Error updating metrics for bill ${bill.bill_id}:`, updateError)
        }
      } catch (error) {
        console.error(`Error processing bill ${bill.bill_id}:`, error)
      }
    }

    console.log('Finished initializing engagement metrics')
  } catch (error) {
    console.error('Error in initializeEngagementMetrics:', error)
  }
}

/**
 * Calculate trend indicator based on recent activity
 */
function calculateTrend(lastActivityAt: string | null, totalVotes: number): 'rising' | 'stable' | 'declining' {
  if (!lastActivityAt) return 'stable'
  
  const daysSinceActivity = Math.floor(
    (Date.now() - new Date(lastActivityAt).getTime()) / (1000 * 60 * 60 * 24)
  )
  
  // Rising if recent activity and decent vote count
  if (daysSinceActivity <= 3 && totalVotes > 2) return 'rising'
  
  // Declining if no recent activity
  if (daysSinceActivity > 14) return 'declining'
  
  return 'stable'
} 
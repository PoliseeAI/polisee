import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function GET() {
  try {
    const supabase = getSupabaseAdmin()
    
    // First, ensure we have engagement metrics for all active bills
    await initializeEngagementMetrics(supabase)
    
    // Query for under-the-radar bills based on real engagement metrics
    const { data: underRadarBills, error } = await supabase
      .from('bill_engagement_metrics' as any)
      .select(`
        bill_id,
        under_radar_score,
        total_votes,
        support_count,
        oppose_count,
        analysis_requests,
        feedback_count,
        popularity_score,
        last_activity_at
      `)
      .gt('under_radar_score', 60) // Only bills with significant under-radar potential
      .lt('total_votes', 15) // Low engagement
      .order('under_radar_score', { ascending: false })
      .limit(10)

    if (error) {
      console.error('Error fetching under-radar bills:', error)
      return NextResponse.json({ bills: [] })
    }

    // Get bill details separately
    const billIds = underRadarBills?.map((item: any) => item.bill_id) || []
    
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
          introduced_date,
          cboc_estimate_url,
          constitutional_authority_text
        `)
        .in('bill_id', billIds)

      if (billsError) {
        console.error('Error fetching bill details:', billsError)
      } else {
        billDetails = bills || []
      }
    }

    // Format the response
    const formattedBills = underRadarBills?.map((item: any) => {
      const billDetail = billDetails.find((bill: any) => bill.bill_id === item.bill_id)
      
      return {
        bill_id: item.bill_id,
        title: billDetail?.title || `Bill ${item.bill_id}`,
        fiscal_impact: generateFiscalImpactDescription(billDetail),
        policy_areas: billDetail?.policy_area ? [billDetail.policy_area] : ['General'],
        analysis_count: item.analysis_requests || 0,
        total_votes: item.total_votes || 0,
        importance_score: Math.round(item.under_radar_score || 0),
        latest_action: billDetail?.latest_action || 'Under review',
        latest_action_date: billDetail?.latest_action_date,
        sponsor_name: billDetail?.sponsor_name,
        sponsor_party: billDetail?.sponsor_party,
        introduced_date: billDetail?.introduced_date,
        has_constitutional_authority: !!billDetail?.constitutional_authority_text,
        has_fiscal_impact: !!billDetail?.cboc_estimate_url,
        engagement_deficit: calculateEngagementDeficit(item),
        why_under_radar: generateUnderRadarReason(item, billDetail)
      }
    }) || []

    // Sort by importance score (highest first)
    const sortedBills = formattedBills.sort((a, b) => b.importance_score - a.importance_score)

    return NextResponse.json({ 
      bills: sortedBills,
      metadata: {
        total_count: sortedBills.length,
        last_updated: new Date().toISOString(),
        calculation_method: 'dynamic_engagement_metrics',
        criteria: {
          max_votes: 15,
          min_importance_score: 60,
          factors_considered: ['fiscal_impact', 'constitutional_authority', 'policy_area', 'engagement_deficit']
        }
      }
    })
  } catch (error) {
    console.error('Error in under-radar bills API:', error)
    
    // Return fallback message instead of hardcoded data
    return NextResponse.json({ 
      bills: [],
      error: 'Unable to load under-the-radar bills. Please try again later.',
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
 * Generate fiscal impact description
 */
function generateFiscalImpactDescription(billDetail: any): string {
  if (!billDetail) return 'No fiscal estimate available'
  
  if (billDetail.cboc_estimate_url) {
    const policyArea = billDetail.policy_area || 'General'
    return `Significant fiscal impact estimated - ${policyArea} sector`
  }
  
  // Estimate based on policy area
  const highImpactAreas = ['Health', 'Education', 'Energy', 'Taxation', 'Transportation']
  if (highImpactAreas.includes(billDetail.policy_area)) {
    return `Potential significant impact on ${billDetail.policy_area} sector`
  }
  
  return 'No fiscal estimate available'
}

/**
 * Calculate engagement deficit
 */
function calculateEngagementDeficit(item: any): number {
  const expectedVotes = Math.max(5, Math.round(item.under_radar_score / 10))
  const actualVotes = item.total_votes || 0
  return Math.max(0, expectedVotes - actualVotes)
}

/**
 * Generate reason why bill is under the radar
 */
function generateUnderRadarReason(item: any, billDetail: any): string {
  const reasons = []
  
  if (item.total_votes < 3) {
    reasons.push('Very low community engagement')
  }
  
  if (item.analysis_requests < 5) {
    reasons.push('Limited analysis requests')
  }
  
  if (billDetail?.cboc_estimate_url) {
    reasons.push('Has fiscal impact but low visibility')
  }
  
  if (billDetail?.constitutional_authority_text) {
    reasons.push('Involves constitutional powers')
  }
  
  const importantAreas = ['Health', 'Education', 'Energy', 'National Security']
  if (importantAreas.includes(billDetail?.policy_area)) {
    reasons.push(`Important ${billDetail.policy_area} legislation`)
  }
  
  if (reasons.length === 0) {
    return 'Low engagement despite potential significance'
  }
  
  return reasons.join('; ')
} 
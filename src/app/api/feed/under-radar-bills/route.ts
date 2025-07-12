import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const refresh = searchParams.get('refresh') === 'true'
    
    const supabase = getSupabaseAdmin()
    
    // First, ensure we have engagement metrics for all active bills
    await initializeEngagementMetrics(supabase)
    
    // For refresh mode, we want more variety - get a larger pool and use different sorting
    if (refresh) {
      // Get a larger pool with more varied criteria for refresh
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
        .gt('under_radar_score', 45) // Lower threshold for more variety
        .lt('total_votes', 20) // Slightly higher vote threshold
        .limit(50) // Get many more bills for better randomization

      if (error) {
        console.error('Error fetching under-radar bills:', error)
        return NextResponse.json({ bills: [] })
      }

      // Randomize the entire array, then take the first 10
      const billsArray = underRadarBills || []
      const shuffledBills = billsArray
        .map((bill: any) => ({ ...bill, randomSort: Math.random() }))
        .sort((a: any, b: any) => a.randomSort - b.randomSort)
        .slice(0, 10)

      return await formatAndReturnBills(supabase, shuffledBills, true)
      
    } else {
      // Default behavior - get top bills by score
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
        .gt('under_radar_score', 60) // Higher threshold for quality
        .lt('total_votes', 15) // Low engagement
        .order('under_radar_score', { ascending: false })
        .limit(10)

      if (error) {
        console.error('Error fetching under-radar bills:', error)
        return NextResponse.json({ bills: [] })
      }

      return await formatAndReturnBills(supabase, underRadarBills || [], false)
    }
    
  } catch (error) {
    console.error('Error in under-radar bills API:', error)
    
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
 * Format bills and return response
 */
async function formatAndReturnBills(supabase: any, selectedBills: any[], isRefresh: boolean) {
  // Get bill details separately
  const billIds = selectedBills?.map((item: any) => item.bill_id) || []
  
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

  // Format the response with reduced randomization for consistency
  const formattedBills = selectedBills?.map((item: any) => {
    const billDetail = billDetails.find((bill: any) => bill.bill_id === item.bill_id)
    
    return {
      bill_id: item.bill_id,
      title: billDetail?.title || `Bill ${item.bill_id}`,
      fiscal_impact: generateFiscalImpactDescription(billDetail),
      policy_areas: billDetail?.policy_area ? [billDetail.policy_area] : ['General'],
      analysis_count: item.analysis_requests || 0,
      total_votes: item.total_votes || 0,
      importance_score: calculateDynamicImportanceScore(item, billDetail, isRefresh),
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
      is_refresh: isRefresh,
      criteria: {
        max_votes: isRefresh ? 20 : 15,
        min_importance_score: isRefresh ? 45 : 60,
        factors_considered: ['fiscal_impact', 'constitutional_authority', 'policy_area', 'engagement_deficit']
      }
    }
  })
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

/**
 * Calculate dynamic importance score based on multiple factors
 */
function calculateDynamicImportanceScore(item: any, billDetail: any, isRefresh: boolean): number {
  let score = 35; // Reduced base score
  
  // Policy area impact (0-20 points, reduced from 25)
  const highImpactAreas = ['Health', 'Education', 'Energy', 'Taxation', 'National Security', 'Environment']
  const mediumImpactAreas = ['Transportation', 'Science, Technology, Communications', 'Finance and Financial Sector']
  
  if (highImpactAreas.includes(billDetail?.policy_area)) {
    score += 20 // Reduced from 25
  } else if (mediumImpactAreas.includes(billDetail?.policy_area)) {
    score += 12 // Reduced from 15
  } else {
    score += 3 // Reduced from 5
  }
  
  // Fiscal impact (0-15 points, reduced from 20)
  if (billDetail?.cboc_estimate_url) {
    score += 15 // Reduced from 20
  }
  
  // Constitutional authority (0-10 points, reduced from 15)
  if (billDetail?.constitutional_authority_text) {
    score += 10 // Reduced from 15
  }
  
  // Title complexity/length indicator (0-8 points, reduced from 10)
  const titleLength = billDetail?.title?.length || 0
  if (titleLength > 100) {
    score += 8 // Very complex legislation
  } else if (titleLength > 80) {
    score += 6 // Reduced from 10
  } else if (titleLength > 50) {
    score += 3 // Reduced from 5
  }
  
  // Engagement deficit bonus (0-12 points, reduced from 15)
  const totalVotes = item.total_votes || 0
  const analysisRequests = item.analysis_requests || 0
  
  if (totalVotes === 0 && analysisRequests === 0) {
    score += 12 // Reduced from 15 - Completely ignored bills
  } else if (totalVotes <= 2) {
    score += 8 // Reduced from 10 - Very low engagement
  } else if (totalVotes <= 5) {
    score += 4 // Reduced from 5 - Low engagement
  }
  
  // Time-based adjustment (0-8 points, reduced from 10)
  if (billDetail?.introduced_date) {
    const daysSinceIntroduced = Math.floor((Date.now() - new Date(billDetail.introduced_date).getTime()) / (1000 * 60 * 60 * 24))
    if (daysSinceIntroduced > 180) {
      score += 8 // Reduced from 10 - Been around for 6+ months
    } else if (daysSinceIntroduced > 90) {
      score += 6 // 3+ months
    } else if (daysSinceIntroduced > 30) {
      score += 3 // Reduced from 5 - 1+ months
    }
  }
  
  // Add some randomization to avoid identical scores (less variation for refresh)
  const randomRange = isRefresh ? 6 : 15 // Reduce randomization on refresh
  const randomOffset = isRefresh ? 3 : 7
  const randomAdjustment = Math.floor(Math.random() * randomRange) - randomOffset
  score += randomAdjustment
  
  // Ensure score stays within reasonable bounds with better distribution
  return Math.max(40, Math.min(100, Math.round(score)))
} 
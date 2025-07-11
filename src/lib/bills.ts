// Bills service with database integration
import { supabase } from '@/lib/supabase'
import { Tables } from '@/types/database'
import { BillFilters } from '@/types/bills-filter'

export type Bill = Tables<'bills'>
export type BillSummary = Tables<'bill_summaries'>
export type BillSubject = Tables<'bill_subjects'>
export type AIBillSummary = Tables<'ai_bill_summaries'>

export interface BillWithDetails extends Bill {
  bill_summaries: BillSummary[]
  bill_subjects: BillSubject[]
}

export interface BillWithAISummary extends Bill {
  ai_bill_summaries: AIBillSummary[]
  bill_subjects: BillSubject[]
}

// Database implementation for bills with content
export async function getBills(): Promise<BillWithDetails[]> {
  try {
    // Get bills that are active
    const { data: billsWithContent, error: billsError } = await supabase
      .from('bills')
      .select(`
        *,
        bill_summaries(*),
        bill_subjects(*)
      `)
      .eq('is_active', true)
      .order('introduced_date', { ascending: false })

    if (billsError) {
      console.error('Error fetching bills with content:', billsError)
      throw billsError
    }

    console.log(`Successfully fetched ${billsWithContent?.length || 0} bills`)
    
    // Handle potential relationship errors by ensuring arrays are properly formed
    const processedBills = (billsWithContent || []).map(bill => ({
      ...bill,
      bill_summaries: Array.isArray(bill.bill_summaries) ? bill.bill_summaries : [],
      bill_subjects: Array.isArray(bill.bill_subjects) ? bill.bill_subjects : []
    }))
    
    return processedBills
  } catch (error) {
    console.error('Error in getBills:', error)
    return []
  }
}

export async function getBillById(billId: string): Promise<BillWithDetails | null> {
  try {
    console.log('Searching for bill with ID:', billId)
    
    // First, try searching by bill_id (most common case)
    console.log('Searching by bill_id for value:', billId)
    
    let { data: bill, error } = await supabase
      .from('bills')
      .select(`
        *,
        bill_summaries(*),
        bill_subjects(*)
      `)
      .eq('bill_id', billId)
      .single()

    // If not found by bill_id and the input is numeric, try searching by primary key id
    if (error && error.code === 'PGRST116' && /^\d+$/.test(billId)) {
      console.log('Not found by bill_id, trying by numeric id:', parseInt(billId))
      
      const result = await supabase
        .from('bills')
        .select(`
          *,
          bill_summaries(*),
          bill_subjects(*)
        `)
        .eq('id', parseInt(billId))
        .single()
      
      bill = result.data
      error = result.error
    }

    if (error) {
      console.error('Error fetching bill:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      return null
    }

    console.log('Found bill:', bill?.title)
    
    if (bill) {
      // Handle potential relationship errors by ensuring arrays are properly formed
      const processedBill = {
        ...bill,
        bill_summaries: Array.isArray(bill.bill_summaries) ? bill.bill_summaries : [],
        bill_subjects: Array.isArray(bill.bill_subjects) ? bill.bill_subjects : []
      }
      return processedBill
    }
    
    return null
  } catch (error) {
    console.error('Error in getBillById:', error)
    return null
  }
}

// Get bills with AI summaries using the efficient foreign key relationship
export async function getBillsWithAISummaries(): Promise<BillWithAISummary[]> {
  try {
    const { data: billsWithAI, error: billsError } = await supabase
      .from('bills')
      .select(`
        *,
        ai_bill_summaries(*),
        bill_subjects(*)
      `)
      .eq('is_active', true)
      .order('introduced_date', { ascending: false })

    if (billsError) {
      console.error('Error fetching bills with AI summaries:', billsError)
      throw billsError
    }

    console.log(`Successfully fetched ${billsWithAI?.length || 0} bills with AI summaries`)
    
    // Handle potential relationship errors by ensuring arrays are properly formed
    const processedBills = (billsWithAI || []).map(bill => ({
      ...bill,
      ai_bill_summaries: Array.isArray(bill.ai_bill_summaries) ? bill.ai_bill_summaries : [],
      bill_subjects: Array.isArray(bill.bill_subjects) ? bill.bill_subjects : []
    }))
    
    return processedBills
  } catch (error) {
    console.error('Error in getBillsWithAISummaries:', error)
    return []
  }
}

// Get a single bill with its AI summary using the efficient foreign key
export async function getBillWithAISummary(billId: string): Promise<BillWithAISummary | null> {
  try {
    // First, try searching by bill_id (most common case)
    let { data: bill, error } = await supabase
      .from('bills')
      .select(`
        *,
        ai_bill_summaries(*),
        bill_subjects(*)
      `)
      .eq('bill_id', billId)
      .single()

    // If not found by bill_id and the input is numeric, try searching by primary key id
    if (error && error.code === 'PGRST116' && /^\d+$/.test(billId)) {
      const result = await supabase
        .from('bills')
        .select(`
          *,
          ai_bill_summaries(*),
          bill_subjects(*)
        `)
        .eq('id', parseInt(billId))
        .single()
      
      bill = result.data
      error = result.error
    }

    if (error) {
      console.error('Error fetching bill with AI summary:', error)
      return null
    }

    if (bill) {
      // Handle potential relationship errors by ensuring arrays are properly formed
      const processedBill = {
        ...bill,
        ai_bill_summaries: Array.isArray(bill.ai_bill_summaries) ? bill.ai_bill_summaries : [],
        bill_subjects: Array.isArray(bill.bill_subjects) ? bill.bill_subjects : []
      }
      return processedBill
    }
    
    return null
  } catch (error) {
    console.error('Error in getBillWithAISummary:', error)
    return null
  }
}

// New function to get bills with comprehensive filters
export async function getBillsWithFilters(filters: BillFilters): Promise<BillWithDetails[]> {
  try {
    let query = supabase
      .from('bills')
      .select(`
        *,
        bill_summaries(*),
        bill_subjects(*)
      `)
      .eq('is_active', true)

    // Text search filters
    if (filters.searchTerm) {
      const searchTerm = `%${filters.searchTerm}%`
      switch (filters.searchType) {
        case 'title':
          query = query.ilike('title', searchTerm)
          break
        case 'fullText':
          query = query.ilike('text', searchTerm)
          break
        case 'billNumber':
          query = query.or(`bill_id.ilike.${searchTerm},number.eq.${parseInt(filters.searchTerm) || 0}`)
          break
        default: // 'all'
          query = query.or(`title.ilike.${searchTerm},policy_area.ilike.${searchTerm},sponsor_name.ilike.${searchTerm},text.ilike.${searchTerm}`)
      }
    }

    // Date range filters
    if (filters.introducedDateFrom) {
      query = query.gte('introduced_date', filters.introducedDateFrom)
    }
    if (filters.introducedDateTo) {
      query = query.lte('introduced_date', filters.introducedDateTo)
    }
    if (filters.lastActionDateFrom) {
      query = query.gte('latest_action_date', filters.lastActionDateFrom)
    }
    if (filters.lastActionDateTo) {
      query = query.lte('latest_action_date', filters.lastActionDateTo)
    }

    // Bill type filters
    if (filters.billTypes && filters.billTypes.length > 0) {
      query = query.in('type', filters.billTypes)
    }

    // Congress filter
    if (filters.congress && filters.congress.length > 0) {
      query = query.in('congress', filters.congress)
    }

    // Chamber filter
    if (filters.chamber && filters.chamber.length > 0) {
      const chamberTypes = filters.chamber.flatMap(chamber => {
        if (chamber === 'House') return ['HR', 'HJRES', 'HCONRES', 'HRES']
        if (chamber === 'Senate') return ['S', 'SJRES', 'SCONRES', 'SRES']
        return []
      })
      if (chamberTypes.length > 0) {
        query = query.in('type', chamberTypes)
      }
    }

    // Sponsor filters
    if (filters.sponsorParty && filters.sponsorParty.length > 0) {
      query = query.in('sponsor_party', filters.sponsorParty)
    }
    if (filters.sponsorState && filters.sponsorState.length > 0) {
      query = query.in('sponsor_state', filters.sponsorState)
    }
    if (filters.sponsorName) {
      query = query.ilike('sponsor_name', `%${filters.sponsorName}%`)
    }

    // Policy area filter
    if (filters.policyAreas && filters.policyAreas.length > 0) {
      const hasUncategorized = filters.policyAreas.includes('Uncategorized')
      if (hasUncategorized && filters.policyAreas.length === 1) {
        query = query.is('policy_area', null)
      } else if (hasUncategorized) {
        const categorizedAreas = filters.policyAreas.filter(area => area !== 'Uncategorized')
        query = query.or(`policy_area.in.(${categorizedAreas.map(a => `"${a}"`).join(',')}),policy_area.is.null`)
      } else {
        query = query.in('policy_area', filters.policyAreas)
      }
    }

    // Sorting
    const sortBy = filters.sortBy || 'introducedDate'
    const sortOrder = filters.sortOrder || 'desc'
    const ascending = sortOrder === 'asc'

    switch (sortBy) {
      case 'introducedDate':
        query = query.order('introduced_date', { ascending, nullsFirst: false })
        break
      case 'lastActionDate':
        query = query.order('latest_action_date', { ascending, nullsFirst: false })
        break
      case 'title':
        query = query.order('title', { ascending })
        break
      // 'relevance' would need full-text search capabilities
    }

    // Execute query
    const { data: billsWithContent, error: billsError } = await query

    if (billsError) {
      console.error('Error fetching bills with filters:', billsError)
      throw billsError
    }

    // Filter by subjects (done in-memory since subjects are in a related table)
    let processedBills = (billsWithContent || []).map(bill => ({
      ...bill,
      bill_summaries: Array.isArray(bill.bill_summaries) ? bill.bill_summaries : [],
      bill_subjects: Array.isArray(bill.bill_subjects) ? bill.bill_subjects : []
    }))

    if (filters.subjects && filters.subjects.length > 0) {
      processedBills = processedBills.filter(bill => 
        bill.bill_subjects.some(subject => 
          filters.subjects!.includes(subject.subject_name)
        )
      )
    }

    // Filter by status (based on latest action text patterns)
    if (filters.status && filters.status.length > 0) {
      processedBills = processedBills.filter(bill => {
        if (!bill.latest_action) return false
        const action = bill.latest_action.toLowerCase()
        
        return filters.status!.some(status => {
          switch (status) {
            case 'introduced':
              return action.includes('introduced')
            case 'committee':
              return action.includes('committee') || action.includes('subcommittee')
            case 'passed_house':
              return action.includes('passed house') || action.includes('passed the house')
            case 'passed_senate':
              return action.includes('passed senate') || action.includes('passed the senate')
            case 'passed_both':
              return action.includes('passed both')
            case 'enacted':
              return action.includes('became law') || action.includes('signed by president') || action.includes('enacted')
            case 'vetoed':
              return action.includes('vetoed')
            default:
              return false
          }
        })
      })
    }

    console.log(`Successfully fetched ${processedBills.length} bills with filters`)
    return processedBills
  } catch (error) {
    console.error('Error in getBillsWithFilters:', error)
    return []
  }
}

// Get unique values for filter options
export async function getBillFilterOptions() {
  try {
    const { data: bills, error } = await supabase
      .from('bills')
      .select(`
        policy_area,
        congress,
        bill_subjects(subject_name)
      `)
      .eq('is_active', true)

    if (error) {
      console.error('Error fetching filter options:', error)
      return {
        policyAreas: [],
        subjects: [],
        congresses: []
      }
    }

    // Extract unique values - filter out null values and ensure proper typing
    const policyAreas = [...new Set(
      bills?.map(b => b.policy_area)
        .filter((area): area is string => area !== null && area !== undefined) || []
    )]
      .sort()
      .concat(['Uncategorized']) // Add option for bills without policy area

    const subjects = [...new Set(
      bills?.flatMap(b => 
        Array.isArray(b.bill_subjects) 
          ? b.bill_subjects.map(s => s.subject_name).filter((name): name is string => name !== null && name !== undefined)
          : []
      ) || []
    )].sort()

    const congresses = [...new Set(
      bills?.map(b => b.congress)
        .filter((congress): congress is number => congress !== null && congress !== undefined) || []
    )]
      .sort((a, b) => b - a) // Sort in descending order

    return {
      policyAreas,
      subjects,
      congresses
    }
  } catch (error) {
    console.error('Error in getBillFilterOptions:', error)
    return {
      policyAreas: [],
      subjects: [],
      congresses: []
    }
  }
}

// Utility functions

export function formatBillTitle(bill: Bill): string {
  return `${bill.type} ${bill.number} - ${bill.title}`
}

export function formatBillId(bill: Bill): string {
  return `${bill.type.toUpperCase()} ${bill.number}`
}

export function getBillStatusColor(bill: Bill): string {
  if (!bill.latest_action) return 'bg-gray-100 text-gray-800'
  
  const action = bill.latest_action.toLowerCase()
  
  if (action.includes('passed')) return 'bg-green-100 text-green-800'
  if (action.includes('committee') || action.includes('subcommittee')) return 'bg-yellow-100 text-yellow-800'
  if (action.includes('introduced')) return 'bg-blue-100 text-blue-800'
  if (action.includes('referred')) return 'bg-yellow-100 text-yellow-800'
  
  return 'bg-gray-100 text-gray-800'
}

export function getPolicyAreaColor(policyArea: string): string {
  switch (policyArea) {
    case 'Education':
      return 'bg-blue-100 text-blue-800'
    case 'Taxation':
      return 'bg-green-100 text-green-800'
    case 'Health':
      return 'bg-red-100 text-red-800'
    case 'Science, Technology, Communications':
      return 'bg-purple-100 text-purple-800'
    case 'Environmental Protection':
      return 'bg-emerald-100 text-emerald-800'
    case 'Social Welfare':
      return 'bg-orange-100 text-orange-800'
    case 'Economics and Public Finance':
      return 'bg-indigo-100 text-indigo-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
} 
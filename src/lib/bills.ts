// Bills service with database integration
import { supabase } from '@/lib/supabase'
import { Tables } from '@/types/database'

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
    // Get bills that are active and have actual text content (not "[No text content available]")
    const { data: billsWithContent, error: billsError } = await supabase
      .from('bills')
      .select(`
        *,
        bill_summaries(*),
        bill_subjects(*)
      `)
      .eq('is_active', true)
      .not('text', 'is', null)
      .not('text', 'eq', '')
      .not('text', 'ilike', '%[No text content available]%')
      .order('introduced_date', { ascending: false })

    if (billsError) {
      console.error('Error fetching bills with content:', billsError)
      throw billsError
    }

    console.log(`Successfully fetched ${billsWithContent?.length || 0} bills with valid text content`)
    return billsWithContent || []
  } catch (error) {
    console.error('Error in getBills:', error)
    return []
  }
}

export async function getBillById(billId: string): Promise<BillWithDetails | null> {
  try {
    const { data: bill, error } = await supabase
      .from('bills')
      .select(`
        *,
        bill_summaries(*),
        bill_subjects(*)
      `)
      .eq('bill_id', billId)
      .single()

    if (error) {
      console.error('Error fetching bill:', error)
      return null
    }

    return bill
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
      .not('text', 'is', null)
      .not('text', 'eq', '')
      .not('text', 'ilike', '%[No text content available]%')
      .order('introduced_date', { ascending: false })

    if (billsError) {
      console.error('Error fetching bills with AI summaries:', billsError)
      throw billsError
    }

    console.log(`Successfully fetched ${billsWithAI?.length || 0} bills with AI summaries`)
    return billsWithAI || []
  } catch (error) {
    console.error('Error in getBillsWithAISummaries:', error)
    return []
  }
}

// Get a single bill with its AI summary using the efficient foreign key
export async function getBillWithAISummary(billId: string): Promise<BillWithAISummary | null> {
  try {
    const { data: bill, error } = await supabase
      .from('bills')
      .select(`
        *,
        ai_bill_summaries(*),
        bill_subjects(*)
      `)
      .eq('bill_id', billId)
      .single()

    if (error) {
      console.error('Error fetching bill with AI summary:', error)
      return null
    }

    return bill
  } catch (error) {
    console.error('Error in getBillWithAISummary:', error)
    return null
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
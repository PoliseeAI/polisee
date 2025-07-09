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
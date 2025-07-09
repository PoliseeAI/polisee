import { supabase } from '@/lib/supabase'
import { Tables } from '@/types/database'
import { PersonaRow } from '@/lib/supabase'
import { SourceReference } from '@/components/ui/source-citation'
import { PersonalImpact } from '@/components/ui/enhanced-impact-card'
import { analyzeImpactsWithAI } from '@/lib/ai-analysis'

export type BillRow = Tables<'bills'>

// Main analysis function - now AI-powered!
export async function generatePersonalizedImpacts(
  billId: string,
  persona: PersonaRow,
  sourceReferences: SourceReference[] = []
): Promise<PersonalImpact[]> {
  try {
    // Get bill with summaries (since text column doesn't exist)
    const { data: bill, error } = await supabase
      .from('bills')
      .select(`
        *,
        bill_summaries(*)
      `)
      .eq('bill_id', billId)
      .single()

    // Use summary text instead of bill.text
    const billText = bill?.bill_summaries?.[0]?.summary_text || bill?.title || ''

    if (error || !bill || !billText) {
      console.error('Error fetching bill or no text available:', error)
      return []
    }

    // Use AI to analyze the bill text and generate personalized impacts
    const impacts = await analyzeImpactsWithAI(
      billText,
      bill.title || 'Untitled Bill',
      persona,
      sourceReferences
    )

    return impacts

  } catch (error) {
    console.error('Error generating personalized impacts:', error)
    return []
  }
} 
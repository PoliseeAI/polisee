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
    // Get bill with full text
    const { data: bill, error } = await supabase
      .from('bills')
      .select('*')
      .eq('bill_id', billId)
      .single()

    if (error || !bill || !bill.text) {
      console.error('Error fetching bill or no text available:', error)
      return []
    }

    // Use AI to analyze the bill text and generate personalized impacts
    const impacts = await analyzeImpactsWithAI(
      bill.text,
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
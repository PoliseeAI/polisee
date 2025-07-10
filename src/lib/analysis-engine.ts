import { supabase } from '@/lib/supabase'
import { Tables } from '@/types/database'
import { PersonaRow } from '@/lib/supabase'
import { PersonalImpact } from '@/components/ui/enhanced-impact-card'
import { analyzeImpactsWithAI } from '@/lib/ai-analysis'
import { chunkTextByParagraph, TextChunk } from './text-chunker' // Import the new chunker

export type BillRow = Tables<'bills'>

// Main analysis function - now AI-powered!
export async function generatePersonalizedImpacts(
  billId: string,
  persona: PersonaRow,
): Promise<PersonalImpact[]> {
  try {
    // Get bill data
    const { data: bill, error } = await supabase
      .from('bills')
      .select('*')
      .eq('bill_id', billId)
      .single()

    if (error) {
      console.error('Error fetching bill:', error)
      return []
    }

    if (!bill) {
      console.error('Bill not found:', billId)
      return []
    }

    // Use the text column from the bills table
    const billText = bill.text || bill.title || 'No content available'

    console.log('Raw bill text from database:', billText); // Log the text before chunking

    if (!billText.trim() || billText === 'No content available') {
      console.error('No bill text available for analysis:', billId)
      return []
    }

    // Chunk the bill text into paragraphs
    const textChunks = chunkTextByParagraph(billText);

    if (textChunks.length === 0) {
      console.error('Bill text could not be chunked:', billId)
      return []
    }

    // Use AI to analyze the bill text and generate personalized impacts
    const impacts = await analyzeImpactsWithAI(
      bill.title || 'Untitled Bill',
      persona,
      textChunks
    )

    return impacts

  } catch (error) {
    console.error('Error generating personalized impacts:', error)
    return []
  }
} 
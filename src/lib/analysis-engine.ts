import { supabase } from '@/lib/supabase'
import { Tables } from '@/types/database'
import { PersonaRow } from '@/lib/supabase'
import { PersonalImpact } from '@/components/ui/enhanced-impact-card'
import { findRelevantSections, analyzeImpact } from './agent-tools'

export type BillRow = Tables<'bills'>

// The new agent that will perform the analysis.
class BillAnalysisAgent {
  private bill: BillRow
  private persona: PersonaRow

  constructor(bill: BillRow, persona: PersonaRow) {
    this.bill = bill
    this.persona = persona
  }

  /**
   * Executes the multi-step analysis process.
   */
  async analyze(): Promise<PersonalImpact[]> {
    console.log(`[Agent] Starting analysis for bill: ${this.bill.title}`)

    const billText = this.bill.text || this.bill.title || 'No content available'
    if (!billText.trim() || billText === 'No content available') {
        console.error('No bill text available for agent analysis:', this.bill.bill_id)
        return []
    }

    // Step 1: Use a tool to find the most relevant sections of the bill.
    console.log('[Agent] Step 1: Finding relevant sections...')
    const relevantSections = await findRelevantSections(billText, this.persona)

    if (!relevantSections || relevantSections.length === 0) {
      console.log('[Agent] No relevant sections found. Ending analysis.')
      return []
    }

    console.log('[Agent] Found ${relevantSections.length} relevant sections.')
    console.log('[Agent] Step 2: Analyzing impact of just those sections...')

    // Step 2: Use a second tool to analyze the impact of only the relevant sections.
    const impacts = await analyzeImpact(relevantSections, this.persona)

    console.log(`[Agent] Analysis complete. Found ${impacts.length} impacts.`)
    return impacts
  }
}


/**
 * The main analysis function, which now delegates the entire process to the agent.
 */
export async function generatePersonalizedImpacts(
  billId: string,
  persona: PersonaRow,
): Promise<PersonalImpact[]> {
  try {
    // 1. Fetch the bill from the database.
    const { data: bill, error } = await supabase
      .from('bills')
      .select('*')
      .eq('bill_id', billId)
      .single()

    if (error) {
      console.error('Error fetching bill:', error)
      throw new Error(`Failed to fetch bill with ID ${billId}`)
    }

    if (!bill) {
      console.error('Bill not found:', billId)
      return []
    }

    // 2. Initialize and run the analysis agent.
    const agent = new BillAnalysisAgent(bill, persona)
    const impacts = await agent.analyze()

    return impacts

  } catch (error) {
    console.error('Error in generatePersonalizedImpacts:', error)
    // Return an empty array to prevent the frontend from crashing.
    return []
  }
}
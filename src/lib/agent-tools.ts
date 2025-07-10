// src/lib/agent-tools.ts
import { PersonaRow } from '@/lib/supabase'
import { PersonalImpact } from '@/components/ui/enhanced-impact-card'
import { getCompletion } from '@/lib/ai-analysis'

export async function findRelevantSections(
  billText: string,
  persona: PersonaRow
): Promise<string[]> {
  const personaSummary = `
- Location: ${persona.location}
- Age: ${persona.age}
- Occupation: ${persona.occupation}
- Income Bracket: ${persona.income_bracket}
- Dependents: ${persona.dependents}
- Education: ${persona.has_higher_education ? 'Has higher education' : 'No higher education'}
- Health Insurance: ${persona.has_health_insurance ? 'Has health insurance' : 'No health insurance'}
${persona.business_type ? `- Business Type: ${persona.business_type} (Employee Count: ${persona.employee_count})` : ''}
`

  const prompt = `
    You are an expert legislative analyst. Your task is to identify the most relevant sections of a bill for a specific person.

    **User Persona:**
    ${personaSummary}

    **Bill Text:**
    ---
    ${billText}
    ---

    Based on the user's persona, please identify and return the sections of the bill that are most likely to have a direct and significant impact on them. Return your answer as a JSON array of strings, where each string is a relevant section from the bill.
  `

  const completion = await getCompletion(prompt)
  try {
    const result = JSON.parse(completion)
    return result.sections || [] // Defensive coding
  } catch (error) {
    console.error('Error parsing relevant sections from AI response:', error)
    return []
  }
}

export async function analyzeImpact(
  sections: string[],
  persona: PersonaRow
): Promise<PersonalImpact[]> {
  const personaSummary = `
- Location: ${persona.location}
- Age: ${persona.age}
- Occupation: ${persona.occupation}
- Income Bracket: ${persona.income_bracket}
- Dependents: ${persona.dependents}
- Education: ${persona.has_higher_education ? 'Has higher education' : 'No higher education'}
- Health Insurance: ${persona.has_health_insurance ? 'Has health insurance' : 'No health insurance'}
${persona.business_type ? `- Business Type: ${persona.business_type} (Employee Count: ${persona.employee_count})` : ''}
`
  const prompt = `
    You are an AI assistant that provides personalized analysis of legislative texts. Analyze the following bill sections and explain their potential impact on the user based on their persona.

    **User Persona:**
    ${personaSummary}

    **Relevant Bill Sections:**
    ---
    ${sections.join('\n\n---\n\n')}
    ---

    For each section, provide a detailed analysis of its potential impact. Structure your response as a JSON object with a key "impacts" which is an array of objects, where each object has the following shape:
    {
      "impact": "positive" | "negative" | "neutral",
      "summary": "A brief summary of the impact.",
      "explanation": "A detailed explanation of how this section affects the user.",
      "category": "financial" | "health" | "family" | "business" | "other"
    }
  `

  const completion = await getCompletion(prompt)
  try {
    const result = JSON.parse(completion);
    const impacts = result.impacts || [];
    
    // We need to associate the source text back to the impact
    return impacts.map((impact: PersonalImpact, index: number) => ({
      ...impact,
      source: {
        text: sections[index] || '' // Add the source text back
      }
    }));
  } catch (error) {
    console.error('Error parsing impact analysis from AI response:', error)
    return []
  }
}
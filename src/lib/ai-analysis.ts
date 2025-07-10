// src/lib/ai-analysis.ts
import { OpenAI } from 'openai'
import { PersonaRow } from '@/lib/supabase'
import { PersonalImpact } from '@/components/ui/enhanced-impact-card'
import { TextChunk } from './text-chunker'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  // It's a good practice to set a timeout
  timeout: 30 * 1000, // 30 seconds
})

/**
 * A generic function to get a completion from the OpenAI API.
 * It's configured to request a JSON response.
 * @param prompt The prompt to send to the AI.
 * @returns A promise that resolves to the string content of the AI's response.
 */
export async function getCompletion(prompt: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.2, // Lower temperature for more deterministic, structured output
    })

    const content = response.choices[0].message?.content
    if (!content) {
      throw new Error('OpenAI returned an empty response.')
    }
    return content
  } catch (error) {
    console.error('Error getting completion from OpenAI:', error)
    // Re-throw the error to be handled by the calling function
    throw error
  }
}

// This is the original AI analysis function. We will refactor it to use the new helper.
export async function analyzeImpactsWithAI(
  billTitle: string,
  persona: PersonaRow,
  textChunks: TextChunk[]
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
    You are an AI assistant that provides personalized analysis of legislative texts.
    Analyze the bill titled "${billTitle}" and its text provided in chunks.
    Explain its potential impact on the user based on their persona.

    **User Persona:**
    ${personaSummary}

    **Bill Text (in chunks):**
    ---
    ${textChunks.map(chunk => chunk.content).join('\n\n---\n\n')}
    ---

    Your task is to identify up to 5 key impacts this bill will have on the user.
    For each impact, provide a detailed analysis.
    Structure your response as a JSON object with a single key "impacts" that contains an array of objects.
    Each object in the array must have the following shape:
    {
      "impact": "positive" | "negative" | "neutral",
      "summary": "A brief summary of the impact (max 20 words).",
      "explanation": "A detailed explanation of how this section affects the user.",
      "category": "financial" | "health" | "family" | "business" | "other",
      "source": {
        "text": "The exact text from the bill chunk that this analysis is based on."
      }
    }
  `

  try {
    const completion = await getCompletion(prompt)
    const result = JSON.parse(completion)
    return result.impacts || []
  } catch (error) {
    console.error('Error analyzing impacts with AI:', error)
    return []
  }
}
import { NextRequest, NextResponse } from 'next/server'
import { PersonaRow } from '@/lib/supabase'

// Type for AI analysis response
interface AIAnalysisResponse {
  impacts: Array<{
    category: string
    impact: 'positive' | 'negative' | 'neutral'
    severity: 'low' | 'medium' | 'high'
    title: string
    description: string
    details: string[]
    relevance_score: number
  }>
}

export async function POST(request: NextRequest) {
  try {
    const { billText, billTitle, persona } = await request.json()

    console.log('Analyze-bill API called for:', billTitle)
    console.log('Bill text length:', billText?.length || 0)
    console.log('Persona location:', persona?.location)

    // Validate required fields
    if (!billText || !billTitle || !persona) {
      console.error('Missing required fields:', { 
        hasBillText: !!billText, 
        hasBillTitle: !!billTitle, 
        hasPersona: !!persona 
      })
      return NextResponse.json(
        { error: 'Missing required fields: billText, billTitle, or persona' },
        { status: 400 }
      )
    }

    // Check if bill text is too short or generic
    if (billText.length < 100) {
      console.warn('Bill text is very short:', billText.length, 'characters')
    }

    // Check if OpenAI API key is available
    const apiKey = process.env.OPENAI_API_KEY
    
    if (!apiKey) {
      console.error('OpenAI API key not configured')
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    // Create persona summary
    const personaSummary = createPersonaSummary(persona)
    
    // Create analysis prompt
    const prompt = createAnalysisPrompt(billText, billTitle, personaSummary)
    
    console.log('Calling OpenAI API...')
    
    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert policy analyst who explains complex legislation in simple, personal terms. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.3
      })
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('OpenAI API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      })
      return NextResponse.json(
        { error: `OpenAI API error: ${response.status} - ${errorText}` },
        { status: 500 }
      )
    }
    
    const result = await response.json()
    console.log('OpenAI API response received, processing...')
    
    const content = result.choices[0]?.message?.content
    
    if (!content) {
      console.error('No content in AI response:', result)
      return NextResponse.json(
        { error: 'No content in AI response' },
        { status: 500 }
      )
    }
    
    try {
      const analysisResult: AIAnalysisResponse = JSON.parse(content)
      console.log('Analysis successful, found', analysisResult.impacts?.length || 0, 'impacts')
      
      // Log impact titles for debugging
      if (analysisResult.impacts) {
        console.log('Impact titles:', analysisResult.impacts.map(i => i.title))
      }
      
      return NextResponse.json(analysisResult)
    } catch (error) {
      console.error('Failed to parse AI response:', content)
      console.error('Parse error:', error)
      return NextResponse.json(
        { error: 'Invalid JSON response from AI' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Error in analyze-bill API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function createPersonaSummary(persona: PersonaRow): string {
  return `
User Profile:
- Age: ${persona.age}
- Location: ${persona.location}
- Occupation: ${persona.occupation}
- Income Bracket: ${persona.income_bracket}
- Dependents: ${persona.dependents}
- Business Type: ${persona.business_type || 'None'}
- Employee Count: ${persona.employee_count || 'N/A'}
- Has Medicare: ${persona.has_medicare ? 'Yes' : 'No'}
- Has Health Insurance: ${persona.has_health_insurance ? 'Yes' : 'No'}
- Has Social Security: ${persona.has_social_security ? 'Yes' : 'No'}
- Has Higher Education: ${persona.has_higher_education ? 'Yes' : 'No'}
- School District: ${persona.school_district || 'Not specified'}
`.trim()
}

function createAnalysisPrompt(billText: string, billTitle: string, personaSummary: string): string {
  return `
You are an expert policy analyst. Analyze how this bill would personally impact the user based on their profile.

BILL TITLE: ${billTitle}

BILL TEXT (first 4000 characters):
${billText.substring(0, 4000)}...

USER PROFILE:
${personaSummary}

TASK: Generate 1-4 specific, personalized impacts this bill would have on this user. Focus on quality over quantity.

IMPORTANT GUIDELINES:
1. If this is a simple bill (like naming a post office), create 1 relevant impact about community recognition
2. For complex bills, find 2-4 specific impacts that match the user's situation
3. Focus on CONCRETE, SPECIFIC effects on this person's life
4. Use CLEAR, NON-TECHNICAL language
5. Explain WHY it affects them based on their situation
6. Include specific dollar amounts, percentages, or quantities when mentioned in the bill
7. Be accurate - only mention impacts that are actually in the bill text
8. If no direct impacts apply, create a general community or procedural impact

For each impact, provide:
- category: (Education, Healthcare, Business, Employment, Taxation, Social Security, Community, etc.)
- impact: (positive, negative, or neutral)
- severity: (low, medium, high) - how much this affects them personally
- title: Brief, clear title (max 60 chars)
- description: One sentence explaining why this affects them (max 120 chars)
- details: 3-4 bullet points with specific impacts on their life
- relevance_score: 1-10 how relevant this is to their specific situation

Return ONLY valid JSON in this format:
{
  "impacts": [
    {
      "category": "Community",
      "impact": "neutral",
      "severity": "low",
      "title": "Local Post Office Recognition",
      "description": "This bill recognizes a community member at your local post office.",
      "details": [
        "Honors local veteran or community leader",
        "No impact on postal services or costs",
        "Symbolic importance for local area",
        "No direct financial impact"
      ],
      "relevance_score": 3
    }
  ]
}

IMPORTANT: 
- Always generate at least 1 impact, even for simple bills
- For post office naming bills, focus on community recognition
- For complex bills, find specific personal impacts
- Use simple language that anyone can understand
- Don't generate empty impacts arrays
`
} 
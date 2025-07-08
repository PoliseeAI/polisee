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

    // Validate required fields
    if (!billText || !billTitle || !persona) {
      return NextResponse.json(
        { error: 'Missing required fields: billText, billTitle, or persona' },
        { status: 400 }
      )
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
      return NextResponse.json(analysisResult)
    } catch (parseError) {
      console.error('Failed to parse AI response:', content)
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

BILL TEXT (first 3000 characters):
${billText.substring(0, 3000)}...

USER PROFILE:
${personaSummary}

TASK: Generate 3-6 specific, personalized impacts this bill would have on this user. For each impact:

1. Focus on CONCRETE, SPECIFIC effects on this person's life
2. Use CLEAR, NON-TECHNICAL language
3. Explain WHY it affects them based on their situation
4. Include specific dollar amounts, percentages, or quantities when mentioned in the bill
5. Be accurate - only mention impacts that are actually in the bill text

For each impact, provide:
- category: (Education, Healthcare, Business, Employment, Taxation, etc.)
- impact: (positive, negative, or neutral)
- severity: (low, medium, high) - how much this affects them personally
- title: Brief, clear title (max 50 chars)
- description: One sentence explaining why this affects them (max 100 chars)
- details: 3-4 bullet points with specific impacts on their life
- relevance_score: 1-10 how relevant this is to their specific situation

Return ONLY valid JSON in this format:
{
  "impacts": [
    {
      "category": "Taxation",
      "impact": "positive",
      "severity": "high",
      "title": "Tax Savings for Your Income Level",
      "description": "Your income bracket qualifies for significant tax reductions.",
      "details": [
        "Save approximately $2,400 annually on federal taxes",
        "Child tax credit increases from $2,000 to $3,000 per child",
        "New deduction for small business owners reduces taxable income",
        "Changes take effect for 2024 tax year"
      ],
      "relevance_score": 9
    }
  ]
}

IMPORTANT: 
- Only include impacts that are ACTUALLY in the bill text
- Be specific about dollar amounts, dates, and eligibility criteria
- Focus on personal impacts, not general policy effects
- Use simple language that anyone can understand
`
} 
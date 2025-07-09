import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy-key',
})

interface Representative {
  title: string
  first_name: string
  last_name: string
  party: string
  state: string
}

interface PersonaData {
  location: string
  age: number
  occupation: string
  income_bracket: string
  education_level?: string
  dependents: number
  business_type?: string
}

export async function POST(request: NextRequest) {
  let representative: Representative | null = null
  let sentiment: string = ''
  let billId: string = ''
  let billTitle: string = ''
  let personaData: PersonaData | null = null
  
  try {
    const requestData = await request.json()
    representative = requestData.representative
    sentiment = requestData.sentiment
    billId = requestData.billId
    billTitle = requestData.billTitle
    personaData = requestData.personaData

    // Validate required fields
    if (!representative || !sentiment || !billId || !billTitle || !personaData) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create a professional message based on sentiment
    const sentimentPrompt = sentiment === 'support' 
      ? 'expressing strong support for' 
      : 'expressing strong opposition to'
    
    const systemPrompt = `You are a professional legislative communication assistant. Create a formal, respectful letter to a representative ${sentimentPrompt} a specific bill. The letter should:

1. Be professional and respectful in tone
2. Clearly state the position (support or opposition) 
3. Include 2-3 specific reasons based on the persona data
4. Be concise but substantive (200-400 words)
5. Include a clear call to action
6. Use formal letter structure

The letter should feel authentic and personalized based on the constituent's background, but maintain professional standards suitable for official correspondence.`

    const userPrompt = `Write a letter to ${representative.title} ${representative.first_name} ${representative.last_name} (${representative.party}-${representative.state}) ${sentimentPrompt} "${billTitle}" (${billId}).

Constituent Information:
- Location: ${personaData.location}
- Age: ${personaData.age}
- Occupation: ${personaData.occupation}
- Income: ${personaData.income_bracket}
- Education: ${personaData.education_level}
- Dependents: ${personaData.dependents}
- Business: ${personaData.business_type || 'N/A'}

Please generate:
1. A professional subject line
2. A formal letter body

The letter should reference how this legislation specifically impacts this constituent based on their background.`

    let response: string | null = null
    
    // Try to use OpenAI if API key is available and properly formatted
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.startsWith('sk-') && process.env.OPENAI_API_KEY !== 'dummy-key' && process.env.OPENAI_API_KEY !== 'dummy_openai_key') {
      try {
        const completion = await openai.chat.completions.create({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: userPrompt
            }
          ],
          max_tokens: 800,
          temperature: 0.7
        })

        response = completion.choices[0]?.message?.content
      } catch (aiError) {
        console.log('OpenAI API not available, using fallback message generation')
        // Fall through to use fallback logic
      }
    }

    if (!response) {
      // Use fallback message generation - create the message directly here
      console.log('Generating fallback message...')
      
      const fallbackSubject = `${sentiment === 'support' ? 'Support for' : 'Opposition to'} ${billTitle}`
      const fallbackMessage = `Dear ${representative.title} ${representative.last_name},

I am writing to express my ${sentiment === 'support' ? 'strong support for' : 'strong opposition to'} ${billTitle} (${billId}).

As a constituent in ${personaData.location}, this legislation has significant implications for my community and myself. Based on my background as a ${personaData.occupation} with ${personaData.dependents} dependents, I believe this bill will ${sentiment === 'support' ? 'positively impact' : 'negatively affect'} people like me.

I urge you to ${sentiment === 'support' ? 'support' : 'oppose'} this legislation when it comes to a vote. Your leadership on this issue is crucial for our community.

Thank you for your time and consideration.

Sincerely,
[Your Name]`

      return NextResponse.json({
        success: true,
        subject: fallbackSubject,
        message: fallbackMessage,
        sentiment,
        representative: {
          name: `${representative.first_name} ${representative.last_name}`,
          party: representative.party,
          state: representative.state
        }
      })
    }

    // Parse the response to extract subject and message
    let subject = `${sentiment === 'support' ? 'Support for' : 'Opposition to'} ${billTitle}`
    let message = response

    // Try to extract subject line if it's formatted properly
    const subjectMatch = response.match(/Subject:\s*(.+)/i)
    if (subjectMatch) {
      subject = subjectMatch[1].trim()
      // Remove subject line from message
      message = response.replace(/Subject:\s*.+\n?/i, '').trim()
    }

    // Clean up the message format
    message = message.replace(/^(Dear|To:|Letter:|Message:)\s*/i, '').trim()

    // Add proper greeting if missing
    if (!message.startsWith('Dear')) {
      message = `Dear ${representative.title} ${representative.last_name},\n\n${message}`
    }

    // Add closing if missing
    if (!message.includes('Sincerely') && !message.includes('Respectfully')) {
      message += '\n\nSincerely,\n[Your Name]'
    }

    return NextResponse.json({
      success: true,
      subject,
      message,
      sentiment,
      representative: {
        name: `${representative.first_name} ${representative.last_name}`,
        party: representative.party,
        state: representative.state
      }
    })

  } catch (error) {
    console.error('Error generating representative message:', error)
    
    // Return error if variables aren't properly initialized
    if (!representative || !sentiment || !billId || !billTitle || !personaData) {
      return NextResponse.json(
        { error: 'Failed to process request data' },
        { status: 500 }
      )
    }
    
    // Return a generic error for unexpected failures
    return NextResponse.json(
      { error: 'Failed to generate message. Please try again.' },
      { status: 500 }
    )
  }
} 
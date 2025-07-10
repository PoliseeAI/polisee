import { NextRequest, NextResponse } from 'next/server'
import { PolicyFormationAgent } from '@/lib/agent/PolicyFormationAgent'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, document, conversationHistory } = body

    if (!message || !document) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create a new agent instance
    const agent = new PolicyFormationAgent()

    // Process the request with status updates
    const response = await agent.processRequest({
      message,
      document,
      conversationHistory: conversationHistory || []
    })

    // Return the response
    return NextResponse.json(response)

  } catch (error) {
    console.error('Policy agent API error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to process request',
        message: 'I apologize, but I encountered an error. Please try again.'
      },
      { status: 500 }
    )
  }
} 
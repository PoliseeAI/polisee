import { NextRequest, NextResponse } from 'next/server'
import { PolicyFormationAgent } from '@/lib/agent/PolicyFormationAgent'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { message, document, conversationHistory } = body
    
    console.log('Policy agent request:', message)
    
    const agent = new PolicyFormationAgent()
    const response = await agent.processRequest({
      message,
      document,
      conversationHistory
    })
    
    console.log('Policy agent response:', {
      toolsUsed: response.toolsUsed,
      messagePreview: response.message.substring(0, 100) + '...'
    })
    
    return NextResponse.json(response)
  } catch (error) {
    console.error('Policy agent error:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
} 
import { NextRequest, NextResponse } from 'next/server'

// In-memory storage for signatures (in production, use a database)
const messageSignatures: Record<string, string[]> = {}

export async function POST(request: NextRequest) {
  try {
    const { messageId, userName, userEmail } = await request.json()

    // Validate required fields
    if (!messageId || !userName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Initialize signatures array if it doesn't exist
    if (!messageSignatures[messageId]) {
      messageSignatures[messageId] = []
    }

    // Check if user has already signed this message
    const existingSignature = messageSignatures[messageId].find(sig => 
      sig.toLowerCase().includes(userName.toLowerCase())
    )

    if (existingSignature) {
      return NextResponse.json(
        { error: 'User has already signed this message' },
        { status: 409 }
      )
    }

    // Add the signature
    const signature = userEmail ? `${userName} <${userEmail}>` : userName
    messageSignatures[messageId].push(signature)

    return NextResponse.json({
      success: true,
      message: 'Message signed successfully',
      signatureCount: messageSignatures[messageId].length,
      signatures: messageSignatures[messageId]
    })

  } catch (error) {
    console.error('Error signing message:', error)
    return NextResponse.json(
      { error: 'Failed to sign message' },
      { status: 500 }
    )
  }
}

// GET endpoint to retrieve signature count
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const messageId = url.searchParams.get('messageId')

    if (!messageId) {
      return NextResponse.json(
        { error: 'Missing messageId parameter' },
        { status: 400 }
      )
    }

    const signatures = messageSignatures[messageId] || []

    return NextResponse.json({
      success: true,
      messageId,
      signatureCount: signatures.length,
      signatures
    })

  } catch (error) {
    console.error('Error retrieving signatures:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve signatures' },
      { status: 500 }
    )
  }
} 
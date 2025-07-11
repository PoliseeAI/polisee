import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

interface MessageSignature {
  id: string
  user_name: string
  user_email: string
  created_at: string
}

interface RepresentativeMessage {
  id: string
  bill_id: string
  custom_message: string
  sentiment: string
  created_at: string
  representatives: {
    first_name: string
    last_name: string
    party: string
    state: string
    title: string
  }
  representative_contact_messages: {
    subject: string
    message_template: string
  }
  letter_signature_analytics: {
    total_signatures: number
    campaign_status: string
    target_signatures: number
  }[]
  letter_signatures: {
    signer_name: string
    user_id: string
    signed_at: string
  }[]
}

export async function GET(request: Request) {
  try {
    const supabase = getSupabaseAdmin()
    
    // Get current user from headers (if authenticated)
    const authHeader = request.headers.get('authorization')
    let currentUserId: string | null = null
    
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7)
        const { data: { user } } = await supabase.auth.getUser(token)
        currentUserId = user?.id || null
        console.log('Current user ID:', currentUserId)
      } catch (error) {
        console.log('Could not get user from token:', error)
      }
    } else {
      console.log('No authorization header found')
    }
    
    // Query for AI-generated messages with signature data
    const { data: messages, error } = await (supabase as any)
      .from('generated_representative_messages')
      .select(`
        id,
        bill_id,
        subject,
        message,
        sentiment,
        threshold_reached,
        created_at,
        is_active
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching messages:', error)
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 500 }
      )
    }

    console.log('Messages found:', messages?.length || 0)

    if (!messages || messages.length === 0) {
      return NextResponse.json({ letters: [] })
    }

    // For each message, get signature data
    const messagesWithSignatures = await Promise.all(
      messages.map(async (message: any) => {
        // Get signature count and list
        const { data: signatures, error: sigError } = await (supabase as any)
          .from('message_signatures')
          .select('user_name, created_at')
          .eq('message_id', message.id)
          .order('created_at', { ascending: false })

        if (sigError) {
          console.error('Error fetching signatures for message:', message.id, sigError)
        }

        const signatureCount = signatures?.length || 0
        const signatureNames = signatures?.map((sig: any) => sig.user_name) || []

        // Check if current user has signed this message
        let hasUserSigned = false
        if (currentUserId) {
          const { data: userSignature } = await (supabase as any)
            .from('message_signatures')
            .select('id')
            .eq('message_id', message.id)
            .eq('user_id', currentUserId)
            .single()

          hasUserSigned = !!userSignature
        }

        return {
          ...message,
          billId: message.bill_id,
          billTitle: message.bill?.title || `Bill ${message.bill_id}`,
          createdAt: message.created_at,
          signatureCount,
          signatures: signatureNames,
          hasUserSigned,
          isSignedByUser: hasUserSigned, // Add for UI compatibility
          targetSignatures: 1,
          bill: {
            bill_id: message.bill_id,
            title: `Bill ${message.bill_id}`,
            short_title: `Bill ${message.bill_id}`
          },
          representative: {
            name: 'AI-Generated Community Letter',
            party: 'Community',
            state: 'All',
            title: 'Community'
          }
        }
      })
    )

    return NextResponse.json({ letters: messagesWithSignatures })
  } catch (error) {
    console.error('Error in letters API:', error)
    
    // Return fallback data for development
    const fallbackLetters = [
      {
        id: 'letter-1',
        billId: 'hr2500-118',
        billTitle: 'Young Adult Economic Security Act',
        sentiment: 'support',
        subject: 'Strong Support for Young Adult Economic Security Act',
        message: 'Dear Senator Smith,\n\nI am writing to express my strong support for the Young Adult Economic Security Act. This legislation would provide crucial support for young adults struggling with student debt, housing costs, and limited job opportunities.\n\nThe provisions for student loan forgiveness, affordable housing assistance, and job training programs would make a real difference in the lives of thousands of young adults in our state.\n\nI urge you to support this important legislation when it comes to a vote.\n\nSincerely,\nYour constituents',
        representative: {
          name: 'John Smith',
          party: 'D',
          state: 'CO',
          title: 'Sen.'
        },
        signatures: ['Alice Johnson', 'Bob Wilson', 'Carol Davis', 'David Brown', 'Emily White'],
        signatureCount: 5,
        createdAt: '2024-01-15T10:30:00Z',
        isSignedByUser: false
      }
    ]

    return NextResponse.json({ letters: fallbackLetters })
  }
} 
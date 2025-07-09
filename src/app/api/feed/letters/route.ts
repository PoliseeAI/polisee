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
      } catch (error) {
        console.log('Could not get user from token:', error)
      }
    }
    
    // Query for representative messages with signature data using actual schema
    const { data: messages, error } = await (supabase as any)
      .from('generated_representative_messages')
      .select(`
        id,
        bill_id,
        subject,
        message,
        sentiment,
        created_at,
        message_signature_analytics!inner(
          total_signatures,
          campaign_status,
          target_signatures
        ),
        message_signatures(
          user_name,
          user_id,
          created_at
        )
      `)
      .eq('is_active', true)
      .gte('message_signature_analytics.total_signatures', 2) // Only letters with multiple signatures
      .eq('message_signature_analytics.campaign_status', 'active')
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error('Error fetching letters:', error)
      // Return empty array if table doesn't exist or has errors
      return NextResponse.json({ letters: [] })
    }

    // Transform the data to match the expected format
    const formattedLetters = (messages as any[])?.map(msg => {
      const analytics = msg.message_signature_analytics?.[0]
      const signatures = msg.message_signatures || []
      const isSignedByUser = currentUserId ? signatures.some((sig: any) => sig.user_id === currentUserId) : false
      
      return {
        id: msg.id,
        billId: msg.bill_id,
        billTitle: `Bill ${msg.bill_id}`, // You might want to join with bills table for actual title
        sentiment: msg.sentiment || 'support',
        subject: msg.subject || 'Legislative Action',
        message: msg.message || '',
        representative: {
          name: 'Generated Campaign', // These are community-generated messages
          party: 'Community',
          state: msg.target_state || 'All',
          title: 'Community'
        },
        signatures: signatures.map((sig: any) => sig.user_name),
        signatureCount: analytics?.total_signatures || 0,
        targetSignatures: analytics?.target_signatures || 100,
        campaignStatus: analytics?.campaign_status || 'active',
        createdAt: msg.created_at,
        isSignedByUser
      }
    }) || []

    return NextResponse.json({ letters: formattedLetters })
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
      },
      {
        id: 'letter-2',
        billId: 'hr3100-118',
        billTitle: 'Climate Action and Jobs Act',
        sentiment: 'support',
        subject: 'Support for Climate Action and Jobs Act',
        message: 'Dear Representative Johnson,\n\nI am writing to express my strong support for the Climate Action and Jobs Act. This comprehensive legislation addresses the urgent need for climate action while creating good-paying jobs in the clean energy sector.\n\nAs a constituent, I believe this bill represents a crucial step toward addressing climate change while boosting our economy. The investments in renewable energy infrastructure and green job training programs will benefit our community for generations to come.\n\nI urge you to vote YES on this important legislation.\n\nSincerely,\nYour constituents',
        representative: {
          name: 'Jane Johnson',
          party: 'D',
          state: 'CO',
          title: 'Rep.'
        },
        signatures: ['Michael Chen', 'Sarah Williams', 'Robert Martinez', 'Lisa Anderson'],
        signatureCount: 4,
        createdAt: '2024-01-14T14:20:00Z',
        isSignedByUser: false
      }
    ]

    return NextResponse.json({ letters: fallbackLetters })
  }
} 
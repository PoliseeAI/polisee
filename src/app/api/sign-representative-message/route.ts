import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

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

    const supabase = getSupabaseAdmin()
    
    // Get current user from headers (if authenticated)
    const authHeader = request.headers.get('authorization')
    let currentUserId: string | null = null
    let sessionId: string | null = null
    
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7)
        const { data: { user } } = await supabase.auth.getUser(token)
        currentUserId = user?.id || null
      } catch (error) {
        console.log('Could not get user from token:', error)
      }
    }
    
    // If no authenticated user, try to get/create a session
    if (!currentUserId) {
      // For anonymous users, create a session or use existing one
      // This is a simplified approach - you might want to implement proper session management
      sessionId = 'anonymous_' + Math.random().toString(36).substr(2, 9)
    }

    // Check if user has already signed this message
    const { data: existingSignature } = await (supabase as any)
      .from('message_signatures')
      .select('id')
      .eq('message_id', messageId)
      .eq('user_id', currentUserId || sessionId)
      .single()

    if (existingSignature) {
      return NextResponse.json(
        { error: 'User has already signed this message' },
        { status: 409 }
      )
    }

    // Get client IP and user agent for tracking
    const clientIP = request.headers.get('x-forwarded-for') || 
      request.headers.get('x-real-ip') || 
      'unknown'
    
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Add the signature to the database
    const { data: signature, error: signatureError } = await (supabase as any)
      .from('message_signatures')
      .insert({
        message_id: messageId,
        user_id: currentUserId || sessionId,
        user_name: userName.trim(),
        user_email: userEmail?.trim() || null,
        location: null, // Can be added later if needed
        ip_address: clientIP,
        user_agent: userAgent
      })
      .select()
      .single()

    if (signatureError) {
      console.error('Error inserting signature:', signatureError)
      return NextResponse.json(
        { error: 'Failed to sign message' },
        { status: 500 }
      )
    }

    // Get updated signature count and list
    const { data: analytics } = await (supabase as any)
      .from('message_signature_analytics')
      .select('total_signatures')
      .eq('message_id', messageId)
      .single()

    const { data: signatures } = await (supabase as any)
      .from('message_signatures')
      .select('user_name, created_at')
      .eq('message_id', messageId)
      .order('created_at', { ascending: false })

    return NextResponse.json({
      success: true,
      message: 'Message signed successfully',
      signatureCount: analytics?.total_signatures || 0,
      signatures: signatures?.map((sig: any) => sig.user_name) || [],
      signatureId: signature.id
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

    const supabase = getSupabaseAdmin()

    // Get signature count from analytics
    const { data: analytics } = await (supabase as any)
      .from('message_signature_analytics')
      .select('total_signatures')
      .eq('message_id', messageId)
      .single()

    // Get signature list
    const { data: signatures } = await (supabase as any)
      .from('message_signatures')
      .select('user_name, created_at')
      .eq('message_id', messageId)
      .order('created_at', { ascending: false })

    return NextResponse.json({
      success: true,
      messageId,
      signatureCount: analytics?.total_signatures || 0,
      signatures: signatures?.map((sig: any) => sig.user_name) || []
    })

  } catch (error) {
    console.error('Error retrieving signatures:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve signatures' },
      { status: 500 }
    )
  }
} 
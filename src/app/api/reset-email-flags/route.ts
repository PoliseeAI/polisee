import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    
    console.log('🔄 Resetting email_sent flags for testing...')
    
    // Reset email_sent flag for all messages
    const { data, error } = await (supabase as any)
      .from('generated_representative_messages')
      .update({
        email_sent: false,
        email_sent_at: null
      })
      .not('email_sent', 'is', null) // Only update messages that have email_sent set

    if (error) {
      console.error('❌ Error resetting email flags:', error)
      return NextResponse.json(
        { error: 'Failed to reset email flags' },
        { status: 500 }
      )
    }

    console.log('✅ Email flags reset successfully')
    
    return NextResponse.json({
      success: true,
      message: 'All email_sent flags reset - you can now test email sending again',
      updatedCount: data?.length || 0
    })

  } catch (error) {
    console.error('Error in reset-email-flags:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 
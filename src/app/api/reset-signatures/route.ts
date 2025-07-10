import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    
    console.log('🔄 Resetting signatures for testing...')
    
    // Delete all signatures for the test user
    const { data, error } = await (supabase as any)
      .from('message_signatures')
      .delete()
      .eq('user_id', '6f83a3fc-ae34-49d1-ac6a-503f6af7cfb3')

    if (error) {
      console.error('Error deleting signatures:', error)
      return NextResponse.json(
        { error: 'Failed to reset signatures' },
        { status: 500 }
      )
    }

    console.log('✅ Signatures reset successfully')
    
    return NextResponse.json({
      success: true,
      message: 'All signatures reset for user',
      deletedCount: data?.length || 0
    })

  } catch (error) {
    console.error('Error in reset-signatures:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 
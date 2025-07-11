import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    
    console.log('🔄 Resetting signatures for testing...')
    
    const testUserId = '6f83a3fc-ae34-49d1-ac6a-503f6af7cfb3'
    
    // First, check what signatures exist
    const { data: existingSignatures, error: checkError } = await (supabase as any)
      .from('message_signatures')
      .select('id, message_id, created_at')
      .eq('user_id', testUserId)

    if (checkError) {
      console.error('Error checking existing signatures:', checkError)
    } else {
      console.log(`📊 Found ${existingSignatures?.length || 0} existing signatures for user ${testUserId}:`, existingSignatures)
    }

    // Delete all signatures for the test user
    const { data, error } = await (supabase as any)
      .from('message_signatures')
      .delete()
      .eq('user_id', testUserId)

    if (error) {
      console.error('❌ Error deleting signatures:', error)
      return NextResponse.json(
        { error: 'Failed to reset signatures' },
        { status: 500 }
      )
    }

    console.log('✅ Signatures reset successfully')
    
    // Verify deletion
    const { data: remainingSignatures, error: verifyError } = await (supabase as any)
      .from('message_signatures')
      .select('id')
      .eq('user_id', testUserId)

    if (!verifyError) {
      console.log(`🔍 Verification: ${remainingSignatures?.length || 0} signatures remaining for user`)
    }
    
    return NextResponse.json({
      success: true,
      message: 'All signatures reset for user',
      deletedCount: existingSignatures?.length || 0,
      remainingCount: remainingSignatures?.length || 0
    })

  } catch (error) {
    console.error('Error in reset-signatures:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 
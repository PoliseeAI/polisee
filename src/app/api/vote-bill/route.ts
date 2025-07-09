import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    const { billId, sentiment, userId } = await request.json();

    if (!billId || !sentiment || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: billId, sentiment, userId' },
        { status: 400 }
      );
    }

    if (!['support', 'oppose'].includes(sentiment)) {
      return NextResponse.json(
        { error: 'Invalid sentiment. Must be "support" or "oppose"' },
        { status: 400 }
      );
    }

    // Check if user has already voted on this bill
    const { data: existingVote, error: voteCheckError } = await supabaseAdmin
      .from('user_bill_votes' as any)
      .select('*')
      .eq('user_id', userId)
      .eq('bill_id', billId)
      .single();

    if (voteCheckError && voteCheckError.code !== 'PGRST116') {
      console.error('Error checking existing vote:', voteCheckError);
      return NextResponse.json(
        { error: 'Failed to check existing vote' },
        { status: 500 }
      );
    }

    let result;
    if (existingVote) {
      // Update existing vote
      console.log('🔄 Updating existing vote:', { userId, billId, sentiment });
      const { data, error } = await supabaseAdmin
        .from('user_bill_votes' as any)
        .update({
          sentiment,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('bill_id', billId)
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating vote:', error);
        return NextResponse.json(
          { error: 'Failed to update vote' },
          { status: 500 }
        );
      }
      console.log('✅ Vote updated successfully:', data);
      result = data;
    } else {
      // Insert new vote
      console.log('➕ Creating new vote:', { userId, billId, sentiment });
      const { data, error } = await supabaseAdmin
        .from('user_bill_votes' as any)
        .insert({
          user_id: userId,
          bill_id: billId,
          sentiment
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating vote:', error);
        return NextResponse.json(
          { error: 'Failed to create vote' },
          { status: 500 }
        );
      }
      console.log('✅ Vote created successfully:', data);
      result = data;
    }

    // Recalculate and update vote counters
    const { data: allVotes, error: votesError } = await supabaseAdmin
      .from('user_bill_votes' as any)
      .select('sentiment')
      .eq('bill_id', billId);

    if (votesError) {
      console.error('Error fetching votes for counter update:', votesError);
      return NextResponse.json(
        { error: 'Failed to fetch votes for counter update' },
        { status: 500 }
      );
    }

    // Calculate counters
    const supportCount = allVotes?.filter((v: any) => v.sentiment === 'support').length || 0;
    const opposeCount = allVotes?.filter((v: any) => v.sentiment === 'oppose').length || 0;
    console.log('📊 Calculated counters:', { supportCount, opposeCount, totalVotes: allVotes?.length });

    // Update the counters
    const { data: voteCounters, error: countersError } = await supabaseAdmin
      .from('bill_vote_counters' as any)
      .upsert({
        bill_id: billId,
        support_count: supportCount,
        oppose_count: opposeCount,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'bill_id'
      })
      .select()
      .single();

    if (countersError) {
      console.error('❌ Error updating vote counters:', countersError);
      return NextResponse.json(
        { error: 'Failed to update vote counters' },
        { status: 500 }
      );
    }
    console.log('📊 Counters updated successfully:', voteCounters);

    // AI message generation will be handled by database triggers
    // This is a placeholder for future AI message generation logic

    return NextResponse.json({
      success: true,
      vote: result,
      counters: voteCounters,
      wasUpdate: !!existingVote
    });

  } catch (error) {
    console.error('Error in vote-bill API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const billId = searchParams.get('billId');
    const userId = searchParams.get('userId');

    if (!billId) {
      return NextResponse.json(
        { error: 'Missing billId parameter' },
        { status: 400 }
      );
    }

    // Get vote counters
    const { data: counters, error: countersError } = await supabaseAdmin
      .from('bill_vote_counters' as any)
      .select('*')
      .eq('bill_id', billId)
      .single();

    if (countersError && countersError.code !== 'PGRST116') {
      console.error('Error fetching vote counters:', countersError);
      return NextResponse.json(
        { error: 'Failed to fetch vote counters' },
        { status: 500 }
      );
    }

    // Get user's vote if userId is provided
    let userVote = null;
    if (userId) {
      const { data: vote, error: voteError } = await supabaseAdmin
        .from('user_bill_votes' as any)
        .select('*')
        .eq('user_id', userId)
        .eq('bill_id', billId)
        .single();

      if (voteError && voteError.code !== 'PGRST116') {
        console.error('Error fetching user vote:', voteError);
      } else {
        userVote = vote;
      }
    }

    return NextResponse.json({
      success: true,
      counters: counters || { bill_id: billId, support_count: 0, oppose_count: 0, total_votes: 0 },
      userVote
    });

  } catch (error) {
    console.error('Error in vote-bill GET API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
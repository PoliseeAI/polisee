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
    const totalVotes = allVotes?.length || 0;
    console.log('📊 Calculated counters:', { supportCount, opposeCount, totalVotes });

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

    // 🚀 AGENTIC WORKFLOW: Check if threshold reached and generate AI message
    const THRESHOLD = 1; // Set threshold to 1 for immediate AI generation
    let aiMessageGenerated = false;

    // Check if we need to generate AI messages for support or oppose
    const shouldGenerateSupport = supportCount === THRESHOLD;
    const shouldGenerateOppose = opposeCount === THRESHOLD;

    if (shouldGenerateSupport || shouldGenerateOppose) {
      console.log('🤖 Threshold reached! Generating AI message(s)...');

      // Get bill information for AI generation
      const { data: bill, error: billError } = await supabaseAdmin
        .from('bills')
        .select('title, bill_id')
        .eq('bill_id', billId)
        .single();

      if (billError || !bill) {
        console.error('Error fetching bill for AI generation:', billError);
      } else {
        // Generate AI message for support if threshold reached
        if (shouldGenerateSupport) {
          try {
            console.log('🤖 Generating AI message for SUPPORT...');
            await generateAIMessage(billId, 'support', bill.title || 'Unknown Bill', userId);
            aiMessageGenerated = true;
          } catch (error) {
            console.error('Error generating support AI message:', error);
          }
        }

        // Generate AI message for oppose if threshold reached
        if (shouldGenerateOppose) {
          try {
            console.log('🤖 Generating AI message for OPPOSE...');
            await generateAIMessage(billId, 'oppose', bill.title || 'Unknown Bill', userId);
            aiMessageGenerated = true;
          } catch (error) {
            console.error('Error generating oppose AI message:', error);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      vote: result,
      counters: voteCounters,
      wasUpdate: !!existingVote,
      aiMessageGenerated,
      message: aiMessageGenerated ? 'AI message generated and will appear in the feed!' : undefined
    });

  } catch (error) {
    console.error('Error in vote-bill API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// 🤖 AI Message Generation Function
async function generateAIMessage(billId: string, sentiment: 'support' | 'oppose', billTitle: string, userId: string) {
  try {
    console.log(`🤖 Generating AI message for ${sentiment} on bill ${billId}: ${billTitle}`);
    
    // Check if an AI message already exists for this bill and sentiment
    const { data: existingMessage, error: checkError } = await supabaseAdmin
      .from('generated_representative_messages' as any)
      .select('id, is_active')
      .eq('bill_id', billId)
      .eq('sentiment', sentiment)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing AI message:', checkError);
      return;
    }

    if (existingMessage) {
      // If message exists but is not active, reactivate it
      if (!(existingMessage as any).is_active) {
        const { error: reactivateError } = await supabaseAdmin
          .from('generated_representative_messages' as any)
          .update({ is_active: true })
          .eq('id', (existingMessage as any).id);

        if (reactivateError) {
          console.error('Error reactivating message:', reactivateError);
          return;
        }
        console.log('✅ Existing AI message reactivated:', (existingMessage as any).id);
      } else {
        console.log('✅ AI message already exists and is active:', (existingMessage as any).id);
      }
      return;
    }

    // Generate a new AI message
    const aiContent = await generateAIMessageContent(sentiment, billTitle);
    
    // Insert new AI message into database WITHOUT user_id
    const { data: newMessage, error: insertError } = await supabaseAdmin
      .from('generated_representative_messages' as any)
      .insert({
        bill_id: billId,
        subject: aiContent.subject,
        message: aiContent.message,
        sentiment: sentiment,
        threshold_reached: 1,
        is_active: true,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting AI message:', insertError);
      return;
    }

    console.log('✅ New AI message generated successfully:', (newMessage as any).id);
    
    // Initialize signature analytics for the new message
    try {
      const { error: analyticsError } = await supabaseAdmin
        .from('message_signature_analytics' as any)
        .insert({
          message_id: (newMessage as any).id,
          signature_count: 0,
          target_signatures: 1,
          created_at: new Date().toISOString()
        });

      if (analyticsError) {
        console.error('❌ Error creating signature analytics:', analyticsError);
      }
    } catch (analyticsError) {
      console.error('❌ Error creating signature analytics:', analyticsError);
    }

  } catch (error) {
    console.error('Error generating AI message:', error);
  }
}

// 🤖 AI Message Content Generation
async function generateAIMessageContent(sentiment: 'support' | 'oppose', billTitle: string) {
  const action = sentiment === 'support' ? 'SUPPORT' : 'OPPOSE';
  const sentimentText = sentiment === 'support' ? 'support' : 'oppose';
  
  // Generate professional AI content
  const subject = `Urgent: ${action} ${billTitle}`;
  
  const message = `Dear Representative,

I am writing to express my strong ${sentimentText} for ${billTitle}.

${sentiment === 'support' ? 
  'This legislation represents an important step forward for our community. The proposed measures will benefit constituents by addressing critical issues that affect our daily lives.' :
  'This legislation raises significant concerns for our community. The proposed measures could have negative impacts on constituents and may not serve the best interests of our district.'
}

${sentiment === 'support' ? 
  'I urge you to vote YES on this important legislation when it comes before you.' :
  'I urge you to vote NO on this legislation and consider alternative approaches that better serve our community.'
}

This message represents the collective voice of your constituents who share this position. We respectfully request your consideration of our views as you make your decision.

Thank you for your time and service to our community.

Sincerely,
Your Concerned Constituents`;

  return { subject, message };
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
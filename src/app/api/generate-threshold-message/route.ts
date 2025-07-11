import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    const { billId, sentiment, messageId, thresholdReached } = await request.json();

    if (!billId || !sentiment || !messageId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get bill information
    const { data: bill, error: billError } = await supabaseAdmin
      .from('bills')
      .select('title, bill_id')
      .eq('bill_id', billId)
      .single();

    if (billError || !bill) {
      console.error('Error fetching bill:', billError);
      return NextResponse.json(
        { error: 'Bill not found' },
        { status: 404 }
      );
    }

    // Generate AI message based on sentiment and bill
    const aiMessage = await generateAIMessage(sentiment, bill.title || 'Unknown Bill', thresholdReached);

    // Update the pending message with the AI-generated content
    const { error: updateError } = await supabaseAdmin
      .from('generated_representative_messages' as any)
      .update({
        subject: aiMessage.subject,
        message: aiMessage.message,
        updated_at: new Date().toISOString()
      })
      .eq('id', messageId);

    if (updateError) {
      console.error('Error updating message:', updateError);
      return NextResponse.json(
        { error: 'Failed to update message' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      messageId,
      subject: aiMessage.subject,
      message: aiMessage.message
    });

  } catch (error) {
    console.error('Error in generate-threshold-message API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function generateAIMessage(sentiment: string, billTitle: string, thresholdReached: number) {
  // For now, return a simple template-based message
  // In a production app, this would call OpenAI or another AI service
  
  const action = sentiment === 'support' ? 'Support' : 'Oppose';
  const verb = sentiment === 'support' ? 'support' : 'oppose';
  
  const subject = `Community Message: ${action} ${billTitle}`;
  
  const message = `Dear [Representative Name],

I am writing as part of a community of ${thresholdReached} constituents who ${verb} the ${billTitle}.

${sentiment === 'support' 
  ? `We believe this legislation would provide important benefits to our community and strongly encourage your support.`
  : `We have concerns about this legislation and its potential impact on our community, and we encourage you to vote against it.`
}

This message represents the collective voice of ${thresholdReached} community members who took the time to analyze this bill and express their position.

${sentiment === 'support' 
  ? `We urge you to support this important legislation.`
  : `We urge you to oppose this legislation.`
}

Thank you for your consideration and for representing our interests.

Sincerely,
The Community Coalition ${sentiment === 'support' ? 'Supporting' : 'Opposing'} ${billTitle}`;

  return {
    subject,
    message
  };
} 
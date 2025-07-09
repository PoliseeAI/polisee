import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sentiment = searchParams.get('sentiment'); // 'support', 'oppose', or null for all
    const userId = searchParams.get('userId');

    // Get active generated messages
    let query = supabaseAdmin
      .from('generated_representative_messages' as any)
      .select('*')
      .eq('is_active', true)
      .neq('subject', 'AI-Generated Message Pending')
      .order('created_at', { ascending: false });

    if (sentiment && ['support', 'oppose'].includes(sentiment)) {
      query = query.eq('sentiment', sentiment);
    }

    const { data: messages, error: messagesError } = await query;

    if (messagesError) {
      console.error('Error fetching messages:', messagesError);
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 500 }
      );
    }

    if (!messages || messages.length === 0) {
      return NextResponse.json({
        success: true,
        messages: []
      });
    }

    // Get bill information for each message
    const billIds = [...new Set(messages.map((msg: any) => msg.bill_id))];
    const { data: bills, error: billsError } = await supabaseAdmin
      .from('bills')
      .select('bill_id, title')
      .in('bill_id', billIds);

    if (billsError) {
      console.error('Error fetching bills:', billsError);
      return NextResponse.json(
        { error: 'Failed to fetch bill information' },
        { status: 500 }
      );
    }

    const billsMap = new Map(bills?.map((bill: any) => [bill.bill_id, bill]) || []);

    // Get signature counts for each message
    const messageIds = messages.map((msg: any) => msg.id);
    const { data: signatures, error: signaturesError } = await supabaseAdmin
      .from('message_signatures' as any)
      .select('message_id, user_name, user_id')
      .in('message_id', messageIds);

    if (signaturesError) {
      console.error('Error fetching signatures:', signaturesError);
      return NextResponse.json(
        { error: 'Failed to fetch signatures' },
        { status: 500 }
      );
    }

    // Group signatures by message ID
    const signaturesMap = new Map<string, any[]>();
    signatures?.forEach((sig: any) => {
      if (!signaturesMap.has(sig.message_id)) {
        signaturesMap.set(sig.message_id, []);
      }
      signaturesMap.get(sig.message_id)?.push(sig);
    });

    // Format messages for frontend
    const formattedMessages = messages.map((msg: any) => {
      const bill = billsMap.get(msg.bill_id);
      const msgSignatures = signaturesMap.get(msg.id) || [];
      const userSignature = userId ? msgSignatures.find((sig: any) => sig.user_id === userId) : null;

      return {
        id: msg.id,
        billId: msg.bill_id,
        billTitle: bill?.title || 'Unknown Bill',
        sentiment: msg.sentiment,
        subject: msg.subject,
        message: msg.message,
        representative: {
          name: 'AI Generated for Community',
          party: 'N/A',
          state: msg.target_state || 'All States',
          title: 'Community Message'
        },
        signatures: msgSignatures.map((sig: any) => sig.user_name),
        createdAt: msg.created_at,
        isSignedByUser: !!userSignature,
        thresholdReached: msg.threshold_reached
      };
    });

    return NextResponse.json({
      success: true,
      messages: formattedMessages
    });

  } catch (error) {
    console.error('Error in feed-messages API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST endpoint for signing messages
export async function POST(request: NextRequest) {
  try {
    const { messageId, userId, userName, userEmail, location } = await request.json();

    if (!messageId || !userId || !userName) {
      return NextResponse.json(
        { error: 'Missing required fields: messageId, userId, userName' },
        { status: 400 }
      );
    }

    // Check if user has already signed this message
    const { data: existingSignature, error: checkError } = await supabaseAdmin
      .from('message_signatures' as any)
      .select('*')
      .eq('message_id', messageId)
      .eq('user_id', userId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing signature:', checkError);
      return NextResponse.json(
        { error: 'Failed to check existing signature' },
        { status: 500 }
      );
    }

    if (existingSignature) {
      return NextResponse.json(
        { error: 'User has already signed this message' },
        { status: 400 }
      );
    }

    // Add signature
    const { data: signature, error: signatureError } = await supabaseAdmin
      .from('message_signatures' as any)
      .insert({
        message_id: messageId,
        user_id: userId,
        user_name: userName,
        user_email: userEmail,
        location: location
      })
      .select()
      .single();

    if (signatureError) {
      console.error('Error adding signature:', signatureError);
      return NextResponse.json(
        { error: 'Failed to add signature' },
        { status: 500 }
      );
    }

    // Get updated signature count
    const { data: signatures, error: countError } = await supabaseAdmin
      .from('message_signatures' as any)
      .select('id')
      .eq('message_id', messageId);

    if (countError) {
      console.error('Error counting signatures:', countError);
      return NextResponse.json(
        { error: 'Failed to count signatures' },
        { status: 500 }
      );
    }

    const signatureCount = signatures?.length || 0;

    // TODO: Check if signature threshold is reached for sending to representatives
    // For now, we'll set a threshold of 25 signatures
    const SIGNATURE_THRESHOLD = 25;
    if (signatureCount >= SIGNATURE_THRESHOLD) {
      // This would trigger sending the message to representatives
      // For now, we'll just log it
      console.log(`Message ${messageId} has reached signature threshold (${signatureCount} signatures)`);
    }

    return NextResponse.json({
      success: true,
      signature: signature,
      signatureCount: signatureCount,
      thresholdReached: signatureCount >= SIGNATURE_THRESHOLD
    });

  } catch (error) {
    console.error('Error in feed-messages POST API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
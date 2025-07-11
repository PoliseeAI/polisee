import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

export async function POST(request: NextRequest) {
  try {
    const { billId, sentiment, userId, reasoning } = await request.json();

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
      console.log('🔄 Updating existing vote:', { userId, billId, sentiment, reasoning });
      const { data, error } = await supabaseAdmin
        .from('user_bill_votes' as any)
        .update({
          sentiment,
          reasoning: reasoning || null,
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

      // If the user provided reasoning, also store it as a feedback entry
      if (reasoning && reasoning.trim().length > 0) {
        await saveReasoningAsFeedback(billId);
      }
    } else {
      // Insert new vote
      console.log('➕ Creating new vote:', { userId, billId, sentiment, reasoning });
      const { data, error } = await supabaseAdmin
        .from('user_bill_votes' as any)
        .insert({
          user_id: userId,
          bill_id: billId,
          sentiment,
          reasoning: reasoning || null
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

      // If the user provided reasoning, also store it as a feedback entry
      if (reasoning && reasoning.trim().length > 0) {
        await saveReasoningAsFeedback(billId);
      }
    }

    // Get current vote counters (they are automatically updated by database triggers)
    const { data: voteCounters, error: countersError } = await supabaseAdmin
      .from('bill_vote_counters' as any)
      .select('*')
      .eq('bill_id', billId)
      .single();

    if (countersError && countersError.code !== 'PGRST116') {
      console.error('❌ Error fetching vote counters:', countersError);
      // Create initial counter if it doesn't exist
      const { data: newCounters, error: createError } = await supabaseAdmin
        .from('bill_vote_counters' as any)
        .insert({
          bill_id: billId,
          support_count: 0,
          oppose_count: 0
        })
        .select()
        .single();
      
      if (createError) {
        console.error('❌ Error creating vote counters:', createError);
        return NextResponse.json(
          { error: 'Failed to initialize vote counters' },
          { status: 500 }
        );
      }
      console.log('📊 Created initial vote counters:', newCounters);
    } else {
      console.log('📊 Current vote counters:', voteCounters);
    }

    // Calculate current counts for threshold check
    const { data: allVotes, error: votesError } = await supabaseAdmin
      .from('user_bill_votes' as any)
      .select('sentiment')
      .eq('bill_id', billId);

    const supportCount = allVotes?.filter((v: any) => v.sentiment === 'support').length || 0;
    const opposeCount = allVotes?.filter((v: any) => v.sentiment === 'oppose').length || 0;
    console.log('📊 Calculated counters for threshold check:', { supportCount, opposeCount });

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
      // Check if we have reasoning that should be incorporated
      const { data: userReasonings, error: reasoningError } = await supabaseAdmin
        .from('user_bill_votes' as any)
        .select('reasoning')
        .eq('bill_id', billId)
        .eq('sentiment', sentiment)
        .not('reasoning', 'is', null);

      const hasReasoning = userReasonings && userReasonings.length > 0;
      
      // Always check if we need to regenerate with community reasoning
      if (hasReasoning) {
        console.log('🔄 Regenerating message to include community reasoning...');
        const reasoningList = userReasonings?.map((vote: any) => vote.reasoning).filter(Boolean) || [];
        const aiContent = await generateAIMessageContent(sentiment, billTitle, reasoningList);
        
        const { error: updateError } = await supabaseAdmin
          .from('generated_representative_messages' as any)
          .update({ 
            is_active: true,
            subject: aiContent.subject,
            message: aiContent.message,
            updated_at: new Date().toISOString()
          })
          .eq('id', (existingMessage as any).id);

        if (updateError) {
          console.error('Error updating message with community reasoning:', updateError);
          return;
        }
        console.log('✅ Message regenerated with community reasoning:', (existingMessage as any).id);
        return;
      }
      
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

    // Collect user reasoning to make AI message more personalized
    const { data: userReasonings, error: reasoningError } = await supabaseAdmin
      .from('user_bill_votes' as any)
      .select('reasoning')
      .eq('bill_id', billId)
      .eq('sentiment', sentiment)
      .not('reasoning', 'is', null);

    if (reasoningError) {
      console.error('Error fetching user reasoning:', reasoningError);
    }

    const reasoningList = userReasonings?.map((vote: any) => vote.reasoning).filter(Boolean) || [];
    console.log(`📝 Found ${reasoningList.length} user reasoning entries for ${sentiment}`);

    // Generate a new AI message with user reasoning
    const aiContent = await generateAIMessageContent(sentiment, billTitle, reasoningList);
    
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
async function generateAIMessageContent(sentiment: 'support' | 'oppose', billTitle: string, userReasonings: string[] = []) {
  const action = sentiment === 'support' ? 'SUPPORT' : 'OPPOSE';
  const sentimentText = sentiment === 'support' ? 'support' : 'oppose';
  
  // Use OpenAI for complete letter generation if available
  if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.startsWith('sk-') && userReasonings.length > 0) {
    try {
      const reasoningText = userReasonings.join('\n---\n');
      
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert political communications specialist. Create a professional, persuasive letter to a representative from constituents who ${sentimentText} a bill.

The letter should:
1. Be formal and respectful
2. Clearly state the position (${sentiment.toUpperCase()})
3. Incorporate the specific concerns and reasoning provided by constituents
4. Be compelling and well-structured
5. Include a clear call to action
6. Be 200-400 words
7. IMPORTANT: Use a COMMUNITY signature (e.g., "The Community Coalition" or "Your Concerned Constituents"), NOT individual signature fields like [Your Name] or [Your Address]

Return your response as a JSON object with two keys:
- "subject": A professional subject line
- "message": The complete formal letter

Make the letter feel authentic and represent the collective voice of constituents who share this position. Do NOT include individual signature fields - this is a community letter.`
          },
                     {
             role: 'user',
             content: `Create a letter to a representative ${sentimentText === 'support' ? 'supporting' : 'opposing'} "${billTitle}".

Here are the specific concerns and reasoning from constituents:

${reasoningText}

IMPORTANT: Include a dedicated section that says "These are just a few of the reasons why the community ${sentimentText}s this bill:" followed by a list of the actual user reasoning (you can paraphrase slightly for flow, but keep the essence). This shows the authentic voice of the community.

Generate a professional letter that incorporates these community concerns and represents the collective voice of constituents who ${sentimentText} this legislation.`
           }
        ],
        max_tokens: 800,
        temperature: 0.7,
        response_format: { type: "json_object" }
      });

      const response = completion.choices[0]?.message?.content;
      if (response) {
        const parsed = JSON.parse(response);
        if (parsed.subject && parsed.message) {
          console.log('✅ Generated AI-powered letter with community reasoning');
          return { subject: parsed.subject, message: parsed.message };
        }
      }
    } catch (error) {
      console.error('Error using OpenAI for full letter generation:', error);
    }
  }
  
  // Fallback to template-based generation with AI-analyzed themes
  const subject = `Urgent: ${action} ${billTitle}`;
  
  // Create personalized reasoning section from user inputs
  let reasoningSection = '';
  if (userReasonings.length > 0) {
    reasoningSection = `\n\nYour constituents have shared their specific concerns and perspectives:\n\n`;
    
    // Analyze and summarize user reasoning
    const commonThemes = await analyzeUserReasonings(userReasonings);
    commonThemes.forEach((theme, index) => {
      reasoningSection += `${index + 1}. ${theme}\n`;
    });
    
    reasoningSection += `\nThese are just a few of the reasons why the community ${sentimentText}s this bill:\n\n`;
    
    // Include individual user reasoning
    userReasonings.forEach((reasoning, index) => {
      if (reasoning && reasoning.trim().length > 0) {
        reasoningSection += `• "${reasoning}"\n`;
      }
    });
    
    reasoningSection += `\nThese points reflect the real concerns and priorities of your constituents.`;
  }
  
  const message = `Dear Representative,

I am writing to express my strong ${sentimentText} for ${billTitle}.

${sentiment === 'support' ? 
  'This legislation represents an important step forward for our community. The proposed measures will benefit constituents by addressing critical issues that affect our daily lives.' :
  'This legislation raises significant concerns for our community. The proposed measures could have negative impacts on constituents and may not serve the best interests of our district.'
}${reasoningSection}

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

// 🤖 AI-powered function to analyze user reasoning and extract key themes
async function analyzeUserReasonings(reasonings: string[]): Promise<string[]> {
  if (reasonings.length === 0) return [];
  
  // Use OpenAI if available, otherwise fallback to keyword analysis
  if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.startsWith('sk-')) {
    try {
      const reasoningText = reasonings.join('\n---\n');
      
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert political analyst. Analyze the provided constituent reasoning and extract 3-5 key themes or concerns. 
            
            For each theme, provide a professional, concise summary that could be included in a letter to a representative. 
            
            Return your response as a JSON array of strings, where each string is a key theme or concern expressed by constituents.
            
            Example format:
            ["Economic concerns about increased healthcare costs affecting middle-class families", "Worries about job security in the manufacturing sector", "Environmental impact on local water quality"]
            
            Focus on the most compelling and common themes across all the reasoning provided.`
          },
          {
            role: 'user',
            content: `Analyze these constituent reasonings and extract key themes:\n\n${reasoningText}`
          }
        ],
        max_tokens: 500,
        temperature: 0.3,
        response_format: { type: "json_object" }
      });

      const response = completion.choices[0]?.message?.content;
      if (response) {
        const parsed = JSON.parse(response);
        // Handle both array format and object format
        if (Array.isArray(parsed)) {
          return parsed;
        } else if (parsed.themes && Array.isArray(parsed.themes)) {
          return parsed.themes;
        } else if (parsed.analysis && Array.isArray(parsed.analysis)) {
          return parsed.analysis;
        }
      }
    } catch (error) {
      console.error('Error using OpenAI for reasoning analysis:', error);
    }
  }
  
  // Fallback to keyword-based analysis
  const themes = [];
  const economicKeywords = ['cost', 'money', 'tax', 'economic', 'financial', 'budget', 'afford'];
  const healthKeywords = ['health', 'medical', 'care', 'safety', 'disease', 'treatment'];
  const environmentKeywords = ['environment', 'climate', 'pollution', 'green', 'clean', 'sustainable'];
  const educationKeywords = ['education', 'school', 'student', 'teacher', 'learn'];
  const jobKeywords = ['job', 'employment', 'work', 'career', 'business'];
  
  const allText = reasonings.join(' ').toLowerCase();
  
  if (economicKeywords.some(keyword => allText.includes(keyword))) {
    themes.push('Economic and financial impacts are a primary concern for constituents.');
  }
  
  if (healthKeywords.some(keyword => allText.includes(keyword))) {
    themes.push('Health and safety implications are important to community members.');
  }
  
  if (environmentKeywords.some(keyword => allText.includes(keyword))) {
    themes.push('Environmental considerations are valued by constituents.');
  }
  
  if (educationKeywords.some(keyword => allText.includes(keyword))) {
    themes.push('Education and learning outcomes matter to families in our district.');
  }
  
  if (jobKeywords.some(keyword => allText.includes(keyword))) {
    themes.push('Employment and job creation are key priorities for voters.');
  }
  
  // If we have specific reasonings but no common themes, include a sample
  if (themes.length === 0 && reasonings.length > 0) {
    const sampleReasoning = reasonings[0];
    if (sampleReasoning.length > 50) {
      themes.push(`As one constituent noted: "${sampleReasoning.substring(0, 150)}..."`);
    } else {
      themes.push(`As one constituent noted: "${sampleReasoning}"`);
    }
  }
  
  return themes;
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

// Helper to record reasoning into sentiment_feedback and bump metrics
async function saveReasoningAsFeedback(billId: string) {
  try {
    // Try to increment feedback_count regardless of existing row
    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from('bill_engagement_metrics' as any)
      .select('feedback_count')
      .eq('bill_id', billId)
      .single();

    let newCount = 1;
    if (!fetchErr && existing) {
      newCount = ((existing as any).feedback_count ?? 0) + 1;
    }

    const { error: upErr } = await supabaseAdmin
      .from('bill_engagement_metrics' as any)
      .upsert({
        bill_id: billId,
        feedback_count: newCount,
        last_activity_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'bill_id' });

    if (upErr) {
      console.error('Failed to upsert feedback_count:', upErr);
    }
  } catch (err) {
    console.error('Unexpected error incrementing feedback_count:', err);
  }
} 
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { Resend } from 'resend'

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY)

// Email sending function with real email delivery
async function sendLetterEmail(emailData: {
  to: string,
  subject: string,
  billId: string,
  sentiment: string,
  letterSubject: string,
  letterMessage: string,
  signatureCount: number,
  targetSignatures: number
}) {
  try {
    // First, log for testing/debugging
    const emailContent = `
=== POLISEE LETTER READY TO SEND ===
TO: ${emailData.to}
SUBJECT: ${emailData.subject}

Bill ID: ${emailData.billId}
Position: ${emailData.sentiment.toUpperCase()}
Signatures: ${emailData.signatureCount}/${emailData.targetSignatures}

LETTER CONTENT:
${emailData.letterSubject}

${emailData.letterMessage}

=== END LETTER ===
`

    console.log('📧 EMAIL TO SEND:')
    console.log(emailContent)

    // Send actual email using Resend
    if (process.env.RESEND_API_KEY) {
      console.log('🚀 Sending actual email via Resend...')
      
      const { data, error } = await resend.emails.send({
        from: 'onboarding@resend.dev', // Use Resend's verified test domain
        to: [emailData.to],
        subject: emailData.subject,
        html: `
          <div style="font-family: 'Times New Roman', serif; max-width: 700px; margin: 0 auto; padding: 40px 20px; background: white; color: #333;">
            <!-- Letter Header -->
            <div style="text-align: center; margin-bottom: 40px; border-bottom: 2px solid #2c3e50; padding-bottom: 20px;">
              <h1 style="margin: 0; font-size: 28px; color: #2c3e50; font-weight: normal;">
                ${emailData.letterSubject}
              </h1>
              <p style="margin: 10px 0 0 0; font-size: 16px; color: #7f8c8d;">
                ${new Date().toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>
            
            <!-- Letter Body -->
            <div style="line-height: 1.8; font-size: 16px; margin-bottom: 40px;">
              <div style="white-space: pre-wrap;">
${emailData.letterMessage}
              </div>
            </div>
            
            <!-- Signature Section -->
            <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #bdc3c7;">
              <p style="margin: 0; font-size: 16px; color: #2c3e50;">
                <strong>Signatures Collected:</strong> ${emailData.signatureCount} constituent${emailData.signatureCount !== 1 ? 's' : ''}
              </p>
              <p style="margin: 10px 0 0 0; font-size: 14px; color: #7f8c8d;">
                Bill ID: ${emailData.billId} | Position: ${emailData.sentiment.toUpperCase()}
              </p>
            </div>
            
            <!-- Footer -->
            <div style="margin-top: 40px; text-align: center; padding-top: 20px; border-top: 1px solid #ecf0f1;">
              <p style="margin: 0; font-size: 12px; color: #95a5a6;">
                This letter was generated through Polisee, a platform that amplifies citizen voices in the democratic process.
              </p>
            </div>
          </div>
        `,
        text: `
${emailData.letterSubject}

${new Date().toLocaleDateString('en-US', { 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric' 
})}

${emailData.letterMessage}

---
Signatures Collected: ${emailData.signatureCount} constituent${emailData.signatureCount !== 1 ? 's' : ''}
Bill ID: ${emailData.billId} | Position: ${emailData.sentiment.toUpperCase()}

This letter was generated through Polisee, a platform that amplifies citizen voices in the democratic process.
        `
      })

          if (error) {
      console.error('❌ Resend error:', error)
      // Don't throw error, just log it - this allows the process to continue
      console.log('📧 Email sending failed, but continuing with signature process')
      return { success: false, error: error.message }
    }

      console.log('✅ Email sent successfully via Resend!')
      console.log('📧 Email ID:', data?.id)
      return { success: true, message: 'Email sent via Resend', emailId: data?.id }
      
    } else {
      console.log('⚠️ No RESEND_API_KEY found - email logged only')
      return { success: true, message: 'Email logged for testing (no API key)' }
    }
    
  } catch (error) {
    console.error('❌ Error sending email:', error)
    throw error
  }
}

export async function POST(request: NextRequest) {
  try {
    const { messageId, userName, userEmail, userId, location } = await request.json()

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
    let currentUserId: string | null = userId || null
    
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7)
        const { data: { user } } = await supabase.auth.getUser(token)
        currentUserId = user?.id || null
      } catch (error) {
        console.log('Could not get user from token:', error)
      }
    }

    // Get message details to identify the bill
    const { data: message, error: messageError } = await (supabase as any)
      .from('generated_representative_messages')
      .select('bill_id, sentiment')
      .eq('id', messageId)
      .single()

    if (messageError || !message) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      )
    }

    // Check for existing signatures - different logic for authenticated vs unauthenticated users
    if (currentUserId) {
      // For authenticated users, check by user_id and message_id
      const { data: existingSignatures, error: checkError } = await (supabase as any)
        .from('message_signatures')
        .select('id, created_at')
        .eq('message_id', messageId)
        .eq('user_id', currentUserId)

      if (checkError) {
        console.error('Error checking existing signatures:', checkError)
        // Continue anyway
      }

      console.log(`🔍 Checking existing signatures for user ${currentUserId} on message ${messageId}`)
      console.log(`📊 Found ${existingSignatures?.length || 0} existing signatures:`, existingSignatures)

      if (existingSignatures && existingSignatures.length > 0) {
        console.log('❌ User has already signed this message')
        return NextResponse.json(
          { error: 'You have already signed this message' },
          { status: 400 }
        )
      } else {
        console.log('✅ No existing signatures found, proceeding with signature')
      }

      // Also remove any existing signatures from this user on this bill (for other messages)
      const { data: billMessages, error: billMessagesError } = await (supabase as any)
        .from('generated_representative_messages')
        .select('id')
        .eq('bill_id', message.bill_id)
        .neq('id', messageId) // Don't include the current message

      if (!billMessagesError && billMessages && billMessages.length > 0) {
        const messageIds = billMessages.map((msg: any) => msg.id)
        const { error: removeError } = await (supabase as any)
          .from('message_signatures')
          .delete()
          .eq('user_id', currentUserId)
          .in('message_id', messageIds)

        if (removeError) {
          console.error('Error removing existing signatures:', removeError)
        } else {
          console.log('✅ Removed existing signatures for user on bill')
        }
      }
    } else {
      // For unauthenticated users, check by name and email
      const { data: existingSignatures, error: checkError } = await (supabase as any)
        .from('message_signatures')
        .select('id')
        .eq('message_id', messageId)
        .eq('user_name', userName)
        .eq('user_email', userEmail || '')

      if (checkError) {
        console.error('Error checking existing signatures:', checkError)
        // Continue anyway
      }

      if (existingSignatures && existingSignatures.length > 0) {
        return NextResponse.json(
          { error: 'You have already signed this message' },
          { status: 400 }
        )
      }
    }

    // Add new signature
    const { data: newSignature, error: signError } = await (supabase as any)
      .from('message_signatures')
      .insert({
        message_id: messageId,
        user_id: currentUserId,
        user_name: userName,
        user_email: userEmail || '',
        location: location || '',
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (signError) {
      console.error('Error adding signature:', signError)
      
      // Handle specific duplicate key error
      if (signError.code === '23505') {
        return NextResponse.json(
          { error: 'You have already signed this message' },
          { status: 400 }
        )
      }
      
      return NextResponse.json(
        { error: 'Failed to add signature' },
        { status: 500 }
      )
    }

    // Get updated signature count
    const { data: signatures, error: countError } = await (supabase as any)
      .from('message_signatures')
      .select('id')
      .eq('message_id', messageId)

    if (countError) {
      console.error('Error getting signature count:', countError)
      return NextResponse.json(
        { error: 'Failed to get signature count' },
        { status: 500 }
      )
    }

    const signatureCount = signatures?.length || 0

    // Update signature analytics
    const { error: analyticsError } = await (supabase as any)
      .from('message_signature_analytics')
      .upsert({
        message_id: messageId,
        total_signatures: signatureCount,
        target_signatures: 1,
        last_signature_at: new Date().toISOString()
      }, {
        onConflict: 'message_id'
      })

    if (analyticsError) {
      console.error('Error updating signature analytics:', analyticsError)
      // Continue - this is not critical
    }

    // Check if target reached and send email
    const targetSignatures = 1 // For testing
    let emailSent = false
    
    if (signatureCount >= targetSignatures) {
      try {
        console.log(`🎯 Target reached! Checking if email needs to be sent for message ${messageId}`)
        console.log(`📊 Signature count: ${signatureCount}/${targetSignatures}`)
        
        // Check if email has already been sent for this message
        const { data: messageStatus, error: statusError } = await (supabase as any)
          .from('generated_representative_messages')
          .select('email_sent')
          .eq('id', messageId)
          .single()

        if (statusError) {
          console.log('Could not check email status, will proceed with sending:', statusError)
        }

        if (messageStatus?.email_sent) {
          console.log('✅ Email already sent for this message')
          emailSent = true
        } else {
          console.log('📧 Email not sent yet, sending now...')
          
          // Get the full message details for the email
          const { data: fullMessage, error: messageError } = await (supabase as any)
            .from('generated_representative_messages')
            .select('subject, message, sentiment, bill_id')
            .eq('id', messageId)
            .single()

          if (fullMessage) {
            const emailResult = await sendLetterEmail({
              to: 'benny.yang@gauntletai.com',
              subject: `[POLISEE] ${fullMessage.subject}`,
              billId: fullMessage.bill_id,
              sentiment: fullMessage.sentiment,
              letterSubject: fullMessage.subject,
              letterMessage: fullMessage.message,
              signatureCount: signatureCount,
              targetSignatures: targetSignatures
            })
            
            if (emailResult && emailResult.success === false) {
              console.log('❌ Email sending failed:', emailResult.error)
            } else {
              console.log('✅ Email sent successfully!')
            }

            // Try to mark message as sent (will fail if column doesn't exist, but that's OK)
            try {
              await (supabase as any)
                .from('generated_representative_messages')
                .update({
                  email_sent: true,
                  email_sent_at: new Date().toISOString()
                })
                .eq('id', messageId)
              console.log('✅ Message marked as sent')
            } catch (updateError) {
              console.log('Could not update sent status (column may not exist):', updateError)
            }
            
            emailSent = true
          } else {
            console.log('❌ Could not get full message details:', messageError)
          }
        }
      } catch (emailError) {
        console.error('❌ Error sending email:', emailError)
        // Don't fail the signature process if email fails
      }
    } else {
      console.log(`📊 Target not reached yet: ${signatureCount}/${targetSignatures}`)
    }

    return NextResponse.json({
      success: true,
      message: 'Signature added successfully',
      signatureCount: signatureCount,
      targetSignatures: targetSignatures,
      targetReached: signatureCount >= targetSignatures,
      emailSent: emailSent,
      signature: newSignature
    })

  } catch (error) {
    console.error('Error in sign-representative-message:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
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

    // Get signature list and count directly
    const { data: signatures, error: sigError } = await (supabase as any)
      .from('message_signatures')
      .select('user_name, created_at')
      .eq('message_id', messageId)
      .order('created_at', { ascending: false })

    if (sigError) {
      console.error('Error fetching signatures:', sigError)
      return NextResponse.json(
        { error: 'Failed to retrieve signatures' },
        { status: 500 }
      )
    }

    const signatureCount = signatures?.length || 0
    const signatureNames = signatures?.map((sig: any) => sig.user_name) || []

    return NextResponse.json({
      success: true,
      messageId,
      signatureCount,
      signatures: signatureNames
    })

  } catch (error) {
    console.error('Error retrieving signatures:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve signatures' },
      { status: 500 }
    )
  }
} 
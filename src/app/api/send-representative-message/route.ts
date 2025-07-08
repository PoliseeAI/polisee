import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { messageId, representative, subject, messageContent, signatures } = await request.json()

    // Validate required fields
    if (!messageId || !representative || !subject || !messageContent) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Simulate sending the message (in production, this would integrate with email service)
    console.log('Sending message to representative:', {
      representative: `${representative.first_name} ${representative.last_name}`,
      subject,
      messageContent,
      signatureCount: signatures?.length || 0
    })

    // Add signature list to the message
    let finalMessage = messageContent
    
    if (signatures && signatures.length > 0) {
      finalMessage += '\n\n--- Signatures ---\n'
      signatures.forEach((signature: string, index: number) => {
        finalMessage += `${index + 1}. ${signature}\n`
      })
    }

    // In a real implementation, you would:
    // 1. Send email via a service like SendGrid, AWS SES, etc.
    // 2. Use the representative's contact form API if available
    // 3. Log the message in a database
    // 4. Track delivery status

    // For now, we'll simulate success
    const contactMethod = representative.email ? 'email' : 'contact_form'
    
    if (contactMethod === 'email' && representative.email) {
      // Simulate email sending
      console.log(`Would send email to: ${representative.email}`)
      console.log(`Subject: ${subject}`)
      console.log(`Message: ${finalMessage}`)
    } else if (representative.contact_form) {
      // Simulate contact form submission
      console.log(`Would submit to contact form: ${representative.contact_form}`)
      console.log(`Subject: ${subject}`)
      console.log(`Message: ${finalMessage}`)
    } else {
      // Provide copy-paste option
      console.log('No direct contact method available - providing copy-paste option')
    }

    // Record the message sending (in production, save to database)
    const messageRecord = {
      messageId,
      representative: {
        name: `${representative.first_name} ${representative.last_name}`,
        party: representative.party,
        state: representative.state
      },
      subject,
      messageContent: finalMessage,
      signatureCount: signatures?.length || 0,
      sentAt: new Date().toISOString(),
      contactMethod
    }

    console.log('Message record:', messageRecord)

    return NextResponse.json({
      success: true,
      message: 'Message sent successfully',
      messageRecord,
      contactMethod,
      signatureCount: signatures?.length || 0
    })

  } catch (error) {
    console.error('Error sending message:', error)
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    )
  }
} 
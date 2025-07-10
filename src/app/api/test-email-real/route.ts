import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY)

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing real email sending functionality...')
    
    if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 'your_resend_api_key_here') {
      return NextResponse.json({
        success: false,
        error: 'RESEND_API_KEY not configured. Please set up your Resend API key in .env file.',
        instructions: 'Go to https://resend.com/api-keys to get your API key'
      }, { status: 400 })
    }

    console.log('🚀 Sending test email via Resend...')
    
    const { data, error } = await resend.emails.send({
      from: 'onboarding@resend.dev', // Use Resend's verified domain
      to: ['benny.yang@gauntletai.com'],
      subject: 'POLISEE Test Email - Simple Version',
      html: `
        <h1>🎉 Polisee Email Test</h1>
        <p>This is a simple test email to verify your Polisee system is working.</p>
        <p><strong>Status:</strong> Email delivery successful!</p>
        <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        <hr>
        <p><small>If you received this email, your Polisee letter notification system is working correctly.</small></p>
      `,
      text: `
POLISEE EMAIL TEST

This is a simple test email to verify your Polisee system is working.

Status: Email delivery successful!
Time: ${new Date().toLocaleString()}

If you received this email, your Polisee letter notification system is working correctly.
      `
    })

    if (error) {
      console.error('❌ Resend error:', error)
      return NextResponse.json({
        success: false,
        error: `Failed to send email: ${error.message}`,
        details: error
      }, { status: 500 })
    }

    console.log('✅ Test email sent successfully via Resend!')
    console.log('📧 Email ID:', data?.id)
    
    // Try to get delivery status
    const deliveryInfo = {
      emailId: data?.id,
      recipient: 'benny.yang@gauntletai.com',
      timestamp: new Date().toISOString(),
      from: 'onboarding@resend.dev',
      subject: 'POLISEE Test Email - Simple Version'
    }
    
    return NextResponse.json({
      success: true,
      message: 'Test email sent successfully!',
      deliveryInfo,
      troubleshooting: {
        checkSpamFolder: 'Look in Spam/Junk folder',
        expectedDelivery: '1-5 minutes',
        fromAddress: 'onboarding@resend.dev',
        tips: [
          'Check spam/junk folder',
          'Wait 2-3 minutes for delivery',
          'Add onboarding@resend.dev to contacts'
        ]
      }
    })
    
  } catch (error) {
    console.error('❌ Error sending test email:', error)
    return NextResponse.json({
      success: false,
      error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 })
  }
} 
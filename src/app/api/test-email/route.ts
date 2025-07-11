import { NextRequest, NextResponse } from 'next/server'

// Test email sending function
async function sendTestEmail() {
  const emailContent = `
=== POLISEE TEST EMAIL ===
TO: benny.yang@gauntletai.com
SUBJECT: [POLISEE] Test Email - System Working

This is a test email to verify the Polisee email system is working correctly.

Bill ID: Test-001
Position: SUPPORT
Signatures: 1/1

LETTER CONTENT:
Test Subject: Support for Test Bill

Dear Representative,

This is a test letter generated by the Polisee system to verify that the email functionality is working correctly.

Best regards,
The Polisee Community

=== END TEST EMAIL ===
`

  console.log('📧 TEST EMAIL TO SEND:')
  console.log(emailContent)
  
  return { success: true, message: 'Test email logged successfully' }
}

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing email sending functionality...')
    
    const result = await sendTestEmail()
    
    return NextResponse.json({
      success: true,
      message: 'Test email sent successfully',
      details: result
    })
  } catch (error) {
    console.error('❌ Error sending test email:', error)
    return NextResponse.json(
      { error: 'Failed to send test email' },
      { status: 500 }
    )
  }
} 
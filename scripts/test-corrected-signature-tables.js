#!/usr/bin/env node

// Test script to verify signature tracking works with actual database schema
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testCorrectedSignatureTables() {
  console.log('🧪 Testing corrected signature tracking system...\n')

  try {
    // Test 1: Check existing generated_representative_messages table
    console.log('1️⃣ Testing generated_representative_messages table...')
    const { data: messages, error: messagesError } = await supabase
      .from('generated_representative_messages')
      .select('*')
      .limit(1)
    
    if (messagesError) {
      throw messagesError
    }
    console.log('✅ generated_representative_messages table exists')
    console.log(`📊 Found ${messages?.length || 0} sample messages`)

    // Test 2: Check existing message_signatures table
    console.log('2️⃣ Testing message_signatures table...')
    const { data: signatures, error: sigError } = await supabase
      .from('message_signatures')
      .select('*')
      .limit(1)
    
    if (sigError) {
      throw sigError
    }
    console.log('✅ message_signatures table exists')
    console.log(`📊 Found ${signatures?.length || 0} existing signatures`)

    // Test 3: Check if new analytics table was created
    console.log('3️⃣ Testing message_signature_analytics table...')
    const { data: analytics, error: analyticsError } = await supabase
      .from('message_signature_analytics')
      .select('*')
      .limit(1)
    
    if (analyticsError) {
      console.log('⚠️  message_signature_analytics table not found - run the corrected SQL script')
      console.log('📝 Run: scripts/corrected-signature-setup.sql in Supabase dashboard')
    } else {
      console.log('✅ message_signature_analytics table exists')
      console.log(`📊 Found ${analytics?.length || 0} analytics records`)
    }

    // Test 4: Test the API endpoint structure
    console.log('4️⃣ Testing API data structure...')
    const { data: testData, error: testError } = await supabase
      .from('generated_representative_messages')
      .select(`
        id,
        bill_id,
        subject,
        message,
        sentiment,
        created_at
      `)
      .eq('is_active', true)
      .limit(1)
    
    if (testError) {
      throw testError
    }
    console.log('✅ API query structure works correctly')

    console.log('\n🎉 Database schema validation completed!')
    console.log('\n📊 Summary:')
    console.log('- ✅ generated_representative_messages: Ready for letters')
    console.log('- ✅ message_signatures: Ready for signature tracking')
    console.log('- 🔄 message_signature_analytics: Run corrected SQL if needed')
    console.log('- ✅ API structure: Compatible with existing schema')
    
    if (!analyticsError) {
      console.log('\n🚀 Your signature tracking system is ready to use!')
    } else {
      console.log('\n📝 Next step: Run scripts/corrected-signature-setup.sql in Supabase dashboard')
    }

  } catch (error) {
    console.error('❌ Error testing tables:', error.message)
    
    console.log('\n🔍 Debugging info:')
    console.log('Your database uses a different schema than expected.')
    console.log('Tables found:')
    console.log('- generated_representative_messages (for letters)')
    console.log('- message_signatures (for signatures)')
    console.log('- Need to create: message_signature_analytics (for campaign metrics)')
    
    console.log('\n📝 To fix:')
    console.log('1. Run scripts/corrected-signature-setup.sql in Supabase dashboard')
    console.log('2. This will enhance your existing tables with analytics')
  }
}

testCorrectedSignatureTables() 
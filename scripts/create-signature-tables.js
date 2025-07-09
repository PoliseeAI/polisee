#!/usr/bin/env node

// Script to create signature tracking tables directly in Supabase
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function createSignatureTables() {
  console.log('🚀 Creating signature tracking tables...\n')

  // Define the SQL statements
  const sqlStatements = [
    // Create letter_signatures table
    `CREATE TABLE IF NOT EXISTS letter_signatures (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      letter_id UUID NOT NULL,
      user_id UUID,
      session_id UUID,
      signer_name TEXT NOT NULL,
      signer_email TEXT,
      signer_location TEXT,
      ip_address INET,
      user_agent TEXT,
      signed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(letter_id, user_id),
      UNIQUE(letter_id, session_id),
      CHECK (user_id IS NOT NULL OR session_id IS NOT NULL)
    )`,

    // Create letter_signature_analytics table
    `CREATE TABLE IF NOT EXISTS letter_signature_analytics (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      letter_id UUID NOT NULL,
      total_signatures INTEGER DEFAULT 0,
      target_signatures INTEGER DEFAULT 100,
      campaign_status TEXT DEFAULT 'active' CHECK (campaign_status IN ('active', 'sent', 'closed')),
      campaign_started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      campaign_sent_at TIMESTAMP WITH TIME ZONE,
      last_signature_at TIMESTAMP WITH TIME ZONE,
      UNIQUE(letter_id)
    )`,

    // Create indexes
    `CREATE INDEX IF NOT EXISTS idx_letter_signatures_letter_id ON letter_signatures(letter_id)`,
    `CREATE INDEX IF NOT EXISTS idx_letter_signatures_user_id ON letter_signatures(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_letter_signatures_session_id ON letter_signatures(session_id)`,
    `CREATE INDEX IF NOT EXISTS idx_letter_signatures_signed_at ON letter_signatures(signed_at)`,
    `CREATE INDEX IF NOT EXISTS idx_letter_signature_analytics_letter_id ON letter_signature_analytics(letter_id)`,
    `CREATE INDEX IF NOT EXISTS idx_letter_signature_analytics_campaign_status ON letter_signature_analytics(campaign_status)`,

    // Enable RLS
    `ALTER TABLE letter_signatures ENABLE ROW LEVEL SECURITY`,
    `ALTER TABLE letter_signature_analytics ENABLE ROW LEVEL SECURITY`,

    // Create RLS policies
    `DROP POLICY IF EXISTS "Analytics are publicly viewable" ON letter_signature_analytics`,
    `CREATE POLICY "Analytics are publicly viewable" ON letter_signature_analytics FOR SELECT USING (true)`,
    `DROP POLICY IF EXISTS "Users can insert their own signatures" ON letter_signatures`,
    `CREATE POLICY "Users can insert their own signatures" ON letter_signatures FOR INSERT WITH CHECK (true)`,
    `DROP POLICY IF EXISTS "Users can view signatures" ON letter_signatures`,
    `CREATE POLICY "Users can view signatures" ON letter_signatures FOR SELECT USING (true)`,

    // Create the trigger function
    `CREATE OR REPLACE FUNCTION update_signature_analytics()
    RETURNS TRIGGER AS $$
    BEGIN
        IF TG_OP = 'INSERT' THEN
            INSERT INTO letter_signature_analytics (letter_id, total_signatures, last_signature_at)
            VALUES (NEW.letter_id, 1, NEW.signed_at)
            ON CONFLICT (letter_id) 
            DO UPDATE SET 
                total_signatures = letter_signature_analytics.total_signatures + 1,
                last_signature_at = NEW.signed_at;
            RETURN NEW;
        ELSIF TG_OP = 'DELETE' THEN
            UPDATE letter_signature_analytics 
            SET total_signatures = GREATEST(total_signatures - 1, 0)
            WHERE letter_id = OLD.letter_id;
            RETURN OLD;
        END IF;
        RETURN NULL;
    END;
    $$ LANGUAGE plpgsql`,

    // Create the trigger
    `DROP TRIGGER IF EXISTS update_signature_analytics_trigger ON letter_signatures`,
    `CREATE TRIGGER update_signature_analytics_trigger
     AFTER INSERT OR DELETE ON letter_signatures
     FOR EACH ROW
     EXECUTE FUNCTION update_signature_analytics()`
  ]

  try {
    for (let i = 0; i < sqlStatements.length; i++) {
      const sql = sqlStatements[i]
      console.log(`⏳ Executing statement ${i + 1}/${sqlStatements.length}...`)
      
      const { error } = await supabase.rpc('exec_sql', { query: sql })
      
      if (error) {
        console.error(`❌ Error in statement ${i + 1}:`, error.message)
        // Continue with other statements even if one fails
      } else {
        console.log(`✅ Statement ${i + 1} executed successfully`)
      }
    }

    console.log('\n🎉 Signature tracking tables creation completed!')
    
    // Test the tables
    console.log('\n🧪 Testing tables...')
    const { data: signatures, error: sigError } = await supabase
      .from('letter_signatures')
      .select('*')
      .limit(1)
    
    const { data: analytics, error: analyticsError } = await supabase
      .from('letter_signature_analytics')
      .select('*')
      .limit(1)

    if (!sigError && !analyticsError) {
      console.log('✅ Tables are working properly!')
      console.log('🚀 Your signature tracking system is ready!')
    } else {
      console.log('⚠️  Tables created but may need manual verification in Supabase dashboard')
    }

  } catch (error) {
    console.error('❌ Error creating tables:', error.message)
  }
}

// Note: The exec_sql function might not exist, so let's try direct SQL execution
async function createTablesDirectly() {
  console.log('🚀 Creating signature tracking tables directly...\n')

  try {
    // Try to create tables by direct SQL query
    const createTablesSQL = `
      CREATE TABLE IF NOT EXISTS letter_signatures (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        letter_id UUID NOT NULL,
        user_id UUID,
        session_id UUID,
        signer_name TEXT NOT NULL,
        signer_email TEXT,
        signer_location TEXT,
        ip_address INET,
        user_agent TEXT,
        signed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(letter_id, user_id),
        UNIQUE(letter_id, session_id),
        CHECK (user_id IS NOT NULL OR session_id IS NOT NULL)
      );

      CREATE TABLE IF NOT EXISTS letter_signature_analytics (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        letter_id UUID NOT NULL,
        total_signatures INTEGER DEFAULT 0,
        target_signatures INTEGER DEFAULT 100,
        campaign_status TEXT DEFAULT 'active' CHECK (campaign_status IN ('active', 'sent', 'closed')),
        campaign_started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        campaign_sent_at TIMESTAMP WITH TIME ZONE,
        last_signature_at TIMESTAMP WITH TIME ZONE,
        UNIQUE(letter_id)
      );
    `

    // This is a fallback approach - the user should run this SQL manually in Supabase dashboard
    console.log('📝 SQL to run in Supabase dashboard:')
    console.log('=====================================')
    console.log(createTablesSQL)
    console.log('=====================================\n')
    
    console.log('🔧 Please run the SQL above in your Supabase dashboard:')
    console.log('1. Go to https://supabase.com/dashboard')
    console.log('2. Select your project')
    console.log('3. Go to SQL Editor')
    console.log('4. Paste and run the SQL above')
    console.log('5. Then run: node scripts/test-signature-tables.js')

  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

createTablesDirectly() 
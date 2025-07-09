import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

// Create admin client for server-side operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient<Database>(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export async function POST() {
  try {
    // First, clear existing data
    await supabaseAdmin.from('representatives').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('representative_contact_messages').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    // Force insert Colorado representatives
    const coloradoReps = [
      {
        bioguide_id: 'B001267',
        first_name: 'Michael',
        last_name: 'Bennet',
        title: 'Sen.',
        party: 'D',
        state: 'CO',
        chamber: 'senate',
        office: '261 Russell Senate Office Building',
        phone: '(202) 224-5852',
        email: 'contact@bennet.senate.gov',
        website: 'https://bennet.senate.gov',
        in_office: true,
        term_start: '2009-01-21',
        term_end: '2029-01-03'
      },
      {
        bioguide_id: 'H001046',
        first_name: 'John',
        last_name: 'Hickenlooper',
        title: 'Sen.',
        party: 'D',
        state: 'CO',
        chamber: 'senate',
        office: '374 Russell Senate Office Building',
        phone: '(202) 224-5941',
        email: 'contact@hickenlooper.senate.gov',
        website: 'https://hickenlooper.senate.gov',
        in_office: true,
        term_start: '2021-01-03',
        term_end: '2027-01-03'
      }
    ];

    const { data: repsData, error: repsError } = await supabaseAdmin
      .from('representatives')
      .insert(coloradoReps);

    if (repsError) {
      console.error('Error inserting representatives:', repsError);
      return NextResponse.json({ error: 'Failed to insert representatives', details: repsError }, { status: 500 });
    }

    // Force insert message templates
    const templates = [
      {
        title: 'Support Economic Legislation',
        subject: 'Please Support {bill_title}',
        category: 'economic',
        bill_type: 'economic',
        message_template: `Dear {representative_name},

I am writing as your constituent from {location} to express my strong support for {bill_title}.

As a {age}-year-old {occupation}, this legislation would have a significant positive impact on my life and the lives of many others in {state}. The economic benefits outlined in this bill are crucial for our community's prosperity.

I urge you to vote YES on this important legislation.

Thank you for your consideration.

Sincerely,
A concerned constituent from {location}`
      },
      {
        title: 'Oppose Economic Legislation',
        subject: 'Please Oppose {bill_title}',
        category: 'economic',
        bill_type: 'economic',
        message_template: `Dear {representative_name},

I am writing as your constituent from {location} to express my concerns about {bill_title}.

As a {age}-year-old {occupation}, I believe this legislation could have unintended negative consequences for hardworking families in {state}. The economic impacts worry me, and I believe there are better alternatives to address these issues.

I urge you to vote NO on this legislation.

Thank you for your consideration.

Sincerely,
A concerned constituent from {location}`
      }
    ];

    const { data: templatesData, error: templatesError } = await supabaseAdmin
      .from('representative_contact_messages')
      .insert(templates);

    if (templatesError) {
      console.error('Error inserting templates:', templatesError);
      return NextResponse.json({ error: 'Failed to insert templates', details: templatesError }, { status: 500 });
    }

    // Verify the data was inserted
    const { data: verifyReps } = await supabaseAdmin
      .from('representatives')
      .select('*')
      .eq('state', 'CO');

    const { data: verifyTemplates } = await supabaseAdmin
      .from('representative_contact_messages')
      .select('*');

    return NextResponse.json({ 
      message: 'Force seeding completed successfully',
      representatives: verifyReps,
      templates: verifyTemplates
    });
  } catch (error) {
    console.error('Error force seeding:', error);
    return NextResponse.json(
      { error: 'Failed to force seed data', details: error },
      { status: 500 }
    );
  }
} 
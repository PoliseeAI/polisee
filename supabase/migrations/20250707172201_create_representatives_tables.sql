-- Create representatives table to store congressional representative information
CREATE TABLE IF NOT EXISTS representatives (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bioguide_id TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  middle_name TEXT,
  last_name TEXT NOT NULL,
  title TEXT NOT NULL, -- Sen., Rep., Del., etc.
  party TEXT NOT NULL, -- R, D, I
  state TEXT NOT NULL,
  district TEXT, -- For House members, NULL for Senators
  office TEXT,
  phone TEXT,
  email TEXT,
  contact_form TEXT,
  website TEXT,
  twitter TEXT,
  facebook TEXT,
  youtube TEXT,
  image_url TEXT,
  term_start DATE,
  term_end DATE,
  next_election TEXT,
  in_office BOOLEAN DEFAULT true,
  chamber TEXT NOT NULL, -- house, senate
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for fast lookups by state and district
CREATE INDEX idx_representatives_state_district ON representatives(state, district);
CREATE INDEX idx_representatives_bioguide ON representatives(bioguide_id);

-- Create representative contact messages table to store pre-written message templates
CREATE TABLE IF NOT EXISTS representative_contact_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  message_template TEXT NOT NULL,
  category TEXT NOT NULL, -- support, oppose, concern, question
  bill_type TEXT, -- general, healthcare, taxation, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user representative contacts table to track when users contact their reps
CREATE TABLE IF NOT EXISTS user_representative_contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  session_id UUID REFERENCES user_sessions(id) ON DELETE CASCADE,
  representative_id UUID REFERENCES representatives(id) ON DELETE CASCADE,
  bill_id TEXT, -- reference to the bill being discussed
  message_id UUID REFERENCES representative_contact_messages(id),
  sentiment TEXT NOT NULL, -- support, oppose
  custom_message TEXT,
  contact_method TEXT DEFAULT 'email', -- email, phone, form
  contacted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert some sample pre-written message templates
INSERT INTO representative_contact_messages (title, subject, message_template, category, bill_type) VALUES
(
  'Support This Bill',
  'Please Support {bill_title}',
  'Dear {representative_title} {representative_last_name},

As your constituent from {user_location}, I am writing to express my strong support for {bill_title}.

Based on my personal circumstances as a {user_age}-year-old {user_occupation} with {user_dependents} dependents and an income of {user_income}, this legislation would have a significant positive impact on my life and family.

{personalized_impact}

I urge you to vote YES on this important legislation.

Thank you for your time and consideration.

Sincerely,
{user_name}
{user_location}',
  'support',
  'general'
),
(
  'Oppose This Bill',
  'Please Oppose {bill_title}',
  'Dear {representative_title} {representative_last_name},

As your constituent from {user_location}, I am writing to express my strong opposition to {bill_title}.

Based on my personal circumstances as a {user_age}-year-old {user_occupation} with {user_dependents} dependents and an income of {user_income}, this legislation would negatively impact my life and family.

{personalized_impact}

I urge you to vote NO on this legislation.

Thank you for your time and consideration.

Sincerely,
{user_name}
{user_location}',
  'oppose',
  'general'
),
(
  'Request More Information',
  'Questions About {bill_title}',
  'Dear {representative_title} {representative_last_name},

As your constituent from {user_location}, I am writing to request more information about {bill_title} and how it might affect people in my situation.

As a {user_age}-year-old {user_occupation} with {user_dependents} dependents and an income of {user_income}, I want to understand:

{personalized_impact}

Could you please provide more details about how this legislation would impact constituents like me?

Thank you for your time and consideration.

Sincerely,
{user_name}
{user_location}',
  'question',
  'general'
),
(
  'Economic Impact Concern',
  'Economic Impact of {bill_title}',
  'Dear {representative_title} {representative_last_name},

As your constituent from {user_location}, I am writing to share my concerns about the economic impact of {bill_title}.

As a {user_age}-year-old {user_occupation} with {user_dependents} dependents and an income of {user_income}, I am particularly concerned about:

{personalized_impact}

I hope you will carefully consider the economic impact on working families like mine when voting on this legislation.

Thank you for your time and consideration.

Sincerely,
{user_name}
{user_location}',
  'concern',
  'economic'
);

-- Add RLS policies
ALTER TABLE representatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE representative_contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_representative_contacts ENABLE ROW LEVEL SECURITY;

-- Representatives are public information
CREATE POLICY "Representatives are viewable by everyone" ON representatives
  FOR SELECT USING (true);

-- Message templates are public
CREATE POLICY "Message templates are viewable by everyone" ON representative_contact_messages
  FOR SELECT USING (true);

-- Users can only see their own contact history
CREATE POLICY "Users can view own contact history" ON user_representative_contacts
  FOR SELECT USING (
    auth.uid() = user_id OR 
    session_id IN (SELECT id FROM user_sessions WHERE session_token = current_setting('request.jwt.claims', true)::json->>'session_token')
  );

-- Users can insert their own contact records
CREATE POLICY "Users can insert own contact records" ON user_representative_contacts
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR 
    session_id IN (SELECT id FROM user_sessions WHERE session_token = current_setting('request.jwt.claims', true)::json->>'session_token')
  ); 
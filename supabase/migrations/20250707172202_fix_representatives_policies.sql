-- Fix RLS policies for representatives tables
-- Add INSERT policies for authenticated users and service role

-- Representatives table: Allow authenticated users to insert (for seeding/admin functions)
CREATE POLICY "Authenticated users can insert representatives" ON representatives
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Representatives table: Allow authenticated users to update (for admin functions)  
CREATE POLICY "Authenticated users can update representatives" ON representatives
  FOR UPDATE USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Message templates table: Allow authenticated users to insert (for seeding/admin functions)
CREATE POLICY "Authenticated users can insert message templates" ON representative_contact_messages
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Message templates table: Allow authenticated users to update (for admin functions)
CREATE POLICY "Authenticated users can update message templates" ON representative_contact_messages
  FOR UPDATE USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- User contact records: Allow authenticated users to update their own records
CREATE POLICY "Users can update own contact records" ON user_representative_contacts
  FOR UPDATE USING (
    auth.uid() = user_id OR 
    session_id IN (SELECT id FROM user_sessions WHERE session_token = current_setting('request.jwt.claims', true)::json->>'session_token')
  ); 
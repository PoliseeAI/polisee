-- Manual Migration: Create Congress Scraper Tables
-- Run this in your Supabase SQL Editor Dashboard

-- Bills table
CREATE TABLE IF NOT EXISTS bills (
    id SERIAL PRIMARY KEY,
    bill_id VARCHAR(50) UNIQUE NOT NULL,
    congress INTEGER NOT NULL,
    type VARCHAR(10) NOT NULL,
    number INTEGER NOT NULL,
    title TEXT,
    introduced_date DATE,
    latest_action_date DATE,
    latest_action TEXT,
    sponsor_id VARCHAR(50),
    sponsor_name VARCHAR(255),
    sponsor_party VARCHAR(10),
    sponsor_state VARCHAR(2),
    is_active BOOLEAN DEFAULT TRUE,
    policy_area VARCHAR(255),
    cboc_estimate_url TEXT,
    constitutional_authority_text TEXT,
    origin_chamber VARCHAR(20),
    update_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    raw_data JSONB
);

-- Bill actions table
CREATE TABLE IF NOT EXISTS bill_actions (
    id SERIAL PRIMARY KEY,
    bill_id VARCHAR(50) NOT NULL,
    action_date DATE,
    action_code VARCHAR(20),
    action_text TEXT,
    source_system VARCHAR(50),
    committee_code VARCHAR(20),
    committee_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bill_id) REFERENCES bills(bill_id) ON DELETE CASCADE
);

-- Bill cosponsors table
CREATE TABLE IF NOT EXISTS bill_cosponsors (
    id SERIAL PRIMARY KEY,
    bill_id VARCHAR(50) NOT NULL,
    member_id VARCHAR(50) NOT NULL,
    member_name VARCHAR(255),
    party VARCHAR(10),
    state VARCHAR(2),
    district INTEGER,
    sponsorship_date DATE,
    is_withdrawn BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bill_id) REFERENCES bills(bill_id) ON DELETE CASCADE
);

-- Bill subjects table
CREATE TABLE IF NOT EXISTS bill_subjects (
    id SERIAL PRIMARY KEY,
    bill_id VARCHAR(50) NOT NULL,
    subject_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bill_id) REFERENCES bills(bill_id) ON DELETE CASCADE
);

-- Bill summaries table
CREATE TABLE IF NOT EXISTS bill_summaries (
    id SERIAL PRIMARY KEY,
    bill_id VARCHAR(50) NOT NULL,
    version_code VARCHAR(20),
    action_date DATE,
    action_desc VARCHAR(255),
    update_date TIMESTAMP,
    summary_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bill_id) REFERENCES bills(bill_id) ON DELETE CASCADE
);

-- Members table
CREATE TABLE IF NOT EXISTS members (
    id SERIAL PRIMARY KEY,
    member_id VARCHAR(50) UNIQUE NOT NULL,
    congress INTEGER NOT NULL,
    chamber VARCHAR(20) NOT NULL,
    title VARCHAR(10),
    first_name VARCHAR(100),
    middle_name VARCHAR(100),
    last_name VARCHAR(100),
    suffix VARCHAR(20),
    nickname VARCHAR(100),
    full_name VARCHAR(255),
    birth_year INTEGER,
    death_year INTEGER,
    party VARCHAR(10),
    state VARCHAR(2),
    district INTEGER,
    leadership_role VARCHAR(100),
    terms JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Committees table
CREATE TABLE IF NOT EXISTS committees (
    id SERIAL PRIMARY KEY,
    committee_code VARCHAR(20) UNIQUE NOT NULL,
    congress INTEGER NOT NULL,
    chamber VARCHAR(20) NOT NULL,
    name VARCHAR(255),
    committee_type VARCHAR(50),
    parent_committee_code VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bills_congress ON bills(congress);
CREATE INDEX IF NOT EXISTS idx_bills_introduced_date ON bills(introduced_date);
CREATE INDEX IF NOT EXISTS idx_bills_sponsor_id ON bills(sponsor_id);
CREATE INDEX IF NOT EXISTS idx_bills_policy_area ON bills(policy_area);
CREATE INDEX IF NOT EXISTS idx_bills_is_active ON bills(is_active);
CREATE INDEX IF NOT EXISTS idx_bills_title ON bills USING GIN(to_tsvector('english', title));

CREATE INDEX IF NOT EXISTS idx_bill_actions_bill_id ON bill_actions(bill_id);
CREATE INDEX IF NOT EXISTS idx_bill_actions_action_date ON bill_actions(action_date);

CREATE INDEX IF NOT EXISTS idx_bill_cosponsors_bill_id ON bill_cosponsors(bill_id);
CREATE INDEX IF NOT EXISTS idx_bill_cosponsors_member_id ON bill_cosponsors(member_id);

CREATE INDEX IF NOT EXISTS idx_bill_subjects_bill_id ON bill_subjects(bill_id);
CREATE INDEX IF NOT EXISTS idx_bill_subjects_subject_name ON bill_subjects(subject_name);

CREATE INDEX IF NOT EXISTS idx_bill_summaries_bill_id ON bill_summaries(bill_id);

CREATE INDEX IF NOT EXISTS idx_members_congress ON members(congress);
CREATE INDEX IF NOT EXISTS idx_members_chamber ON members(chamber);
CREATE INDEX IF NOT EXISTS idx_members_state ON members(state);
CREATE INDEX IF NOT EXISTS idx_members_party ON members(party);

CREATE INDEX IF NOT EXISTS idx_committees_congress ON committees(congress);
CREATE INDEX IF NOT EXISTS idx_committees_chamber ON committees(chamber);

-- Enable Row Level Security (RLS)
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_cosponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE committees ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Public read access on bills" ON bills FOR SELECT USING (true);
CREATE POLICY "Public read access on bill_actions" ON bill_actions FOR SELECT USING (true);
CREATE POLICY "Public read access on bill_cosponsors" ON bill_cosponsors FOR SELECT USING (true);
CREATE POLICY "Public read access on bill_subjects" ON bill_subjects FOR SELECT USING (true);
CREATE POLICY "Public read access on bill_summaries" ON bill_summaries FOR SELECT USING (true);
CREATE POLICY "Public read access on members" ON members FOR SELECT USING (true);
CREATE POLICY "Public read access on committees" ON committees FOR SELECT USING (true);

-- Create policies for authenticated insert/update/delete
CREATE POLICY "Authenticated users can insert bills" ON bills FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update bills" ON bills FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete bills" ON bills FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert bill_actions" ON bill_actions FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update bill_actions" ON bill_actions FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete bill_actions" ON bill_actions FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert bill_cosponsors" ON bill_cosponsors FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update bill_cosponsors" ON bill_cosponsors FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete bill_cosponsors" ON bill_cosponsors FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert bill_subjects" ON bill_subjects FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update bill_subjects" ON bill_subjects FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete bill_subjects" ON bill_subjects FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert bill_summaries" ON bill_summaries FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update bill_summaries" ON bill_summaries FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete bill_summaries" ON bill_summaries FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert members" ON members FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update members" ON members FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete members" ON members FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert committees" ON committees FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update committees" ON committees FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete committees" ON committees FOR DELETE USING (auth.role() = 'authenticated'); 
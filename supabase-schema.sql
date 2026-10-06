-- 401k Advisory CRM - Supabase Schema
-- Run this in your Supabase SQL Editor (supabase.com > your project > SQL Editor)

-- Users table
CREATE TABLE crm_users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'advisor' CHECK (role IN ('admin', 'manager', 'advisor')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Deals table
CREATE TABLE deals (
  id TEXT PRIMARY KEY,
  company_name TEXT NOT NULL,
  website TEXT,
  deal_stage TEXT NOT NULL DEFAULT 'prospect',
  lead_source TEXT,
  deal_created DATE,
  stage_changed DATE,
  advisor_id TEXT REFERENCES crm_users(id),
  advisor_name TEXT,
  estimated_aum NUMERIC DEFAULT 0,
  notes TEXT,
  created_by TEXT,
  last_modified_by TEXT,
  last_modified_at TIMESTAMPTZ DEFAULT now()
);

-- Audit log table
CREATE TABLE audit_log (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT now(),
  user_id TEXT,
  user_name TEXT,
  deal_id TEXT,
  deal_name TEXT,
  action TEXT NOT NULL,
  field TEXT,
  old_value TEXT,
  new_value TEXT
);

-- Automations settings (single row)
CREATE TABLE automations (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE crm_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE automations ENABLE ROW LEVEL SECURITY;

-- RLS Policies: allow full access via anon key (app handles permissions client-side)
CREATE POLICY "Allow all access to crm_users" ON crm_users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to deals" ON deals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to audit_log" ON audit_log FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to automations" ON automations FOR ALL USING (true) WITH CHECK (true);

-- Seed default users
INSERT INTO crm_users (id, name, email, role) VALUES
  ('u1', 'Sarah Johnson', 'sarah@advisory.com', 'admin'),
  ('u2', 'Mike Chen', 'mike@advisory.com', 'advisor'),
  ('u3', 'Lisa Park', 'lisa@advisory.com', 'advisor'),
  ('u4', 'David Kim', 'david@advisory.com', 'manager');

-- Seed default deals
INSERT INTO deals (id, company_name, website, deal_stage, lead_source, deal_created, stage_changed, advisor_id, advisor_name, estimated_aum, notes, created_by, last_modified_by, last_modified_at) VALUES
  ('d1', 'Acme Manufacturing', 'https://acme.com', 'proposal', 'Referral', '2026-03-01', '2026-03-20', 'u2', 'Mike Chen', 5000000, 'Large manufacturing company, 200+ employees', 'u2', 'u2', '2026-03-20T10:00:00Z'),
  ('d2', 'TechFlow Inc', 'https://techflow.io', 'qualified', 'Website', '2026-03-10', '2026-03-15', 'u3', 'Lisa Park', 3200000, 'Fast-growing tech startup', 'u3', 'u3', '2026-03-15T14:00:00Z'),
  ('d3', 'Green Valley Foods', 'https://greenvalley.com', 'negotiation', 'Conference', '2026-02-15', '2026-03-25', 'u2', 'Mike Chen', 8500000, 'Regional food distributor', 'u2', 'u2', '2026-03-25T09:00:00Z'),
  ('d4', 'Sunrise Healthcare', 'https://sunrisehealth.com', 'closed-won', 'Referral', '2026-01-10', '2026-03-01', 'u3', 'Lisa Park', 12000000, 'Healthcare group, 5 locations', 'u3', 'u3', '2026-03-01T11:00:00Z'),
  ('d5', 'Pacific Logistics', 'https://paclog.com', 'prospect', 'Cold Call', '2026-03-28', '2026-03-28', 'u2', 'Mike Chen', 2000000, 'Initial contact made', 'u2', 'u2', '2026-03-28T16:00:00Z'),
  ('d6', 'Metro Construction', 'https://metroconstruct.com', 'closed-lost', 'Partner', '2026-02-01', '2026-03-10', 'u3', 'Lisa Park', 4000000, 'Went with competitor', 'u3', 'u3', '2026-03-10T10:00:00Z'),
  ('d7', 'Summit Financial Group', 'https://summitfg.com', 'proposal', 'Existing Client', '2026-03-05', '2026-03-22', 'u2', 'Mike Chen', 15000000, 'Expanding existing 401k plan', 'u2', 'u1', '2026-03-22T08:00:00Z'),
  ('d8', 'BlueStar Retail', 'https://bluestar.com', 'qualified', 'Marketing Campaign', '2026-03-18', '2026-03-25', 'u3', 'Lisa Park', 6000000, 'Chain of retail stores, 150 employees', 'u3', 'u3', '2026-03-25T13:00:00Z');

-- Seed default automations
INSERT INTO automations (id, settings) VALUES (1, '{
  "weeklyEmail": {"enabled": true, "day": 5, "time": "09:00", "subject": "Weekly Deal Update - Please Report New Deals & Changes", "body": ""},
  "stageNotify": true,
  "closedWonNotify": true
}'::jsonb);

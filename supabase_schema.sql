-- ═══════════════════════════════════════════════════
-- SolarEdge Chatbot — Supabase Database Schema
-- Run this in your Supabase SQL Editor
-- ═══════════════════════════════════════════════════

-- 1. Chat Leads (name + email captured before chat starts)
CREATE TABLE IF NOT EXISTS chat_leads (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Chat Sessions (one session per lead conversation)
CREATE TABLE IF NOT EXISTS chat_sessions (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id     UUID REFERENCES chat_leads(id) ON DELETE CASCADE,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Chat Messages (all messages in a session)
CREATE TABLE IF NOT EXISTS chat_messages (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id  UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('user', 'bot')),
  content     TEXT NOT NULL,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_lead_id ON chat_sessions(lead_id);
CREATE INDEX IF NOT EXISTS idx_chat_leads_email ON chat_leads(email);

-- Enable Row Level Security (optional but recommended)
ALTER TABLE chat_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Allow all inserts/reads from anon key (for the chatbot)
CREATE POLICY "Allow inserts" ON chat_leads FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow selects" ON chat_leads FOR SELECT USING (true);
CREATE POLICY "Allow inserts" ON chat_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow selects" ON chat_sessions FOR SELECT USING (true);
CREATE POLICY "Allow inserts" ON chat_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow selects" ON chat_messages FOR SELECT USING (true);

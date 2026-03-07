-- TenderWatch — Supabase PostgreSQL Schema
-- Run this in the Supabase SQL editor

-- ── Users (mirrors auth.users) ────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       text,
  full_name   text,
  company_name text,
  created_at  timestamptz DEFAULT now(),
  plan        text DEFAULT 'free' CHECK (plan IN ('free', 'pro'))
);

-- ── Watchlists ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS watchlists (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid REFERENCES users(id) ON DELETE CASCADE,
  name           text NOT NULL,
  keywords       text[] NOT NULL DEFAULT '{}',
  portals        text[] NOT NULL DEFAULT '{}',
  min_value      bigint,
  max_value      bigint,
  location       text,
  is_active      boolean DEFAULT true,
  scan_frequency text DEFAULT 'daily' CHECK (scan_frequency IN ('daily', 'twice_daily', 'hourly')),
  last_scanned_at timestamptz,
  created_at     timestamptz DEFAULT now()
);

-- ── Tenders ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenders (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  watchlist_id     uuid REFERENCES watchlists(id) ON DELETE SET NULL,
  user_id          uuid REFERENCES users(id) ON DELETE CASCADE,
  portal           text NOT NULL,
  title            text NOT NULL,
  reference_number text,
  department       text,
  value_raw        text,
  value_numeric    bigint,
  deadline         date,
  location         text,
  description      text,
  urgency          text CHECK (urgency IN ('high', 'medium', 'low')),
  is_saved         boolean DEFAULT false,
  is_read          boolean DEFAULT false,
  source_url       text,
  found_at         timestamptz DEFAULT now()
);

-- ── Scan Runs ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scan_runs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  watchlist_id    uuid REFERENCES watchlists(id) ON DELETE CASCADE,
  started_at      timestamptz DEFAULT now(),
  completed_at    timestamptz,
  portals_scanned text[] DEFAULT '{}',
  tenders_found   int DEFAULT 0,
  status          text DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  error           text
);

-- ── Alert Settings ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alert_settings (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  email_enabled  boolean DEFAULT true,
  email_address  text,
  alert_on       text[] DEFAULT '{new_tender}',
  digest_time    time DEFAULT '08:00'
);

-- ── Row Level Security ────────────────────────────────────────
ALTER TABLE users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlists     ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenders        ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_runs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_settings ENABLE ROW LEVEL SECURITY;

-- Users: can only see/edit own row
CREATE POLICY "users_own" ON users FOR ALL USING (auth.uid() = id);

-- Watchlists: own rows only
CREATE POLICY "watchlists_own" ON watchlists FOR ALL USING (auth.uid() = user_id);

-- Tenders: own rows only
CREATE POLICY "tenders_own" ON tenders FOR ALL USING (auth.uid() = user_id);

-- Scan runs: via watchlist ownership
CREATE POLICY "scan_runs_own" ON scan_runs FOR ALL
  USING (EXISTS (SELECT 1 FROM watchlists w WHERE w.id = scan_runs.watchlist_id AND w.user_id = auth.uid()));

-- Alert settings: own row
CREATE POLICY "alert_settings_own" ON alert_settings FOR ALL USING (auth.uid() = user_id);

-- ── Indexes ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS tenders_user_id_idx      ON tenders(user_id);
CREATE INDEX IF NOT EXISTS tenders_deadline_idx     ON tenders(deadline);
CREATE INDEX IF NOT EXISTS tenders_portal_idx       ON tenders(portal);
CREATE INDEX IF NOT EXISTS watchlists_user_id_idx   ON watchlists(user_id);

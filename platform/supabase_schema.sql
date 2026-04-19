-- ============================================================
-- CarbonBridge — Supabase PostgreSQL Schema
-- Run this in Supabase SQL Editor: https://app.supabase.com
-- ============================================================

-- ── Enable UUID extension ──────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── 1. USERS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email               TEXT UNIQUE NOT NULL,
  password_hash       TEXT NOT NULL,
  name                TEXT NOT NULL,
  role                TEXT NOT NULL DEFAULT 'CLIENT'
                      CHECK (role IN ('ADMIN', 'CLIENT')),
  is_temp_password    BOOLEAN DEFAULT TRUE,
  assigned_project_id UUID,
  created_by          UUID,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  last_login          TIMESTAMPTZ,
  is_active           BOOLEAN DEFAULT TRUE
);

-- ── 2. PROJECTS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_name          TEXT NOT NULL,
  company_name          TEXT NOT NULL,
  capacity_mw           NUMERIC(10,3) NOT NULL,
  state                 TEXT,
  district              TEXT,
  village               TEXT,
  latitude              NUMERIC(10,6),
  longitude             NUMERIC(10,6),
  commissioning_date    DATE,
  discom                TEXT,
  module_type           TEXT,
  inverter_details      TEXT,
  number_of_panels      INTEGER,
  substation            TEXT,
  contact_person        TEXT,
  contact_email         TEXT,
  contact_phone         TEXT,
  methodology           TEXT DEFAULT 'AMS-I.D',
  status                TEXT DEFAULT 'draft'
                        CHECK (status IN ('draft', 'monitoring', 'registered')),
  crediting_period_start DATE,
  crediting_period_end   DATE,
  cuf_factor            NUMERIC(5,3) DEFAULT 0.19,
  grid_emission_factor  NUMERIC(6,4) DEFAULT 0.82,
  project_hash          TEXT UNIQUE,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (company_name, commissioning_date),
  UNIQUE (latitude, longitude)
);

-- Link users → projects FK
ALTER TABLE users
  ADD CONSTRAINT fk_users_project
  FOREIGN KEY (assigned_project_id) REFERENCES projects(id) ON DELETE SET NULL;

-- ── 3. GENERATION_DATA ────────────────────────────────────
CREATE TABLE IF NOT EXISTS generation_data (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  month           SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
  year            SMALLINT NOT NULL CHECK (year BETWEEN 2000 AND 2100),
  mwh_generated   NUMERIC(12,3) NOT NULL CHECK (mwh_generated >= 0),
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_comment   TEXT,
  submitted_by    UUID REFERENCES users(id),
  submitted_at    TIMESTAMPTZ DEFAULT NOW(),
  approved_by     UUID REFERENCES users(id),
  approved_at     TIMESTAMPTZ,
  proof_file_url  TEXT,
  proof_file_name TEXT,
  source_type     TEXT DEFAULT 'manual'
                  CHECK (source_type IN ('manual', 'api', 'bill_upload', 'csv')),
  raw_data        JSONB,
  UNIQUE (project_id, month, year)
);

-- ── 4. AUDIT_LOGS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES users(id),
  user_email  TEXT,
  action      TEXT NOT NULL,
  entity_type TEXT,
  entity_id   TEXT,
  old_value   JSONB,
  new_value   JSONB,
  ip_address  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 5. NOTIFICATIONS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  title       TEXT NOT NULL,
  message     TEXT,
  entity_type TEXT,
  entity_id   TEXT,
  is_read     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 6. DOCUMENTS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS documents (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id      UUID REFERENCES projects(id) ON DELETE CASCADE,
  doc_type        TEXT NOT NULL,
  doc_label       TEXT,
  file_url        TEXT NOT NULL,
  file_name       TEXT,
  file_size_bytes INTEGER,
  mime_type       TEXT,
  is_verified     BOOLEAN DEFAULT FALSE,
  verified_by     UUID REFERENCES users(id),
  verified_at     TIMESTAMPTZ,
  uploaded_by     UUID REFERENCES users(id),
  uploaded_at     TIMESTAMPTZ DEFAULT NOW(),
  notes           TEXT
);

-- ── 7. GENERATION_API_CONFIGS ─────────────────────────────
-- Stores SCADA / DISCOM API credentials per project
CREATE TABLE IF NOT EXISTS generation_api_configs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  source_name   TEXT NOT NULL,
  source_type   TEXT NOT NULL CHECK (source_type IN ('scada', 'discom', 'huawei', 'sma', 'fronius', 'custom')),
  api_url       TEXT,
  api_key       TEXT,
  username      TEXT,
  password_enc  TEXT,
  config_json   JSONB,
  is_active     BOOLEAN DEFAULT TRUE,
  last_pull_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Indexes ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_gen_project    ON generation_data(project_id);
CREATE INDEX IF NOT EXISTS idx_gen_status     ON generation_data(status);
CREATE INDEX IF NOT EXISTS idx_gen_year       ON generation_data(year);
CREATE INDEX IF NOT EXISTS idx_audit_user     ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action   ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_notif_user     ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_docs_project   ON documents(project_id);

-- ── RLS Policies (Row Level Security) ────────────────────
ALTER TABLE users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects           ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_data    ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications      ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents          ENABLE ROW LEVEL SECURITY;

-- Service role bypasses all RLS (used by API routes)
-- Public/anon role: blocked
CREATE POLICY "service_role_all" ON users           FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all" ON projects        FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all" ON generation_data FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all" ON audit_logs      FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all" ON notifications   FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all" ON documents       FOR ALL TO service_role USING (true);

-- ── Seed default ADMIN ──────────────────────────────────
-- Password: CarbonBridge@2024! (bcrypt hash)
INSERT INTO users (email, password_hash, name, role, is_temp_password)
VALUES (
  'admin@carbonbridge.in',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiGniMO6YXIegEq1bJWiJPqnMvim',
  'CarbonBridge Admin',
  'ADMIN',
  FALSE
) ON CONFLICT (email) DO NOTHING;

-- ── Updated_at trigger ────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

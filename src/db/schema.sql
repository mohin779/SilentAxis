CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES organizations(id),
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('EMPLOYEE', 'ORG_ADMIN', 'ORG_STAFF'))
);

CREATE TABLE IF NOT EXISTS identity_commitments (
  id UUID PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES organizations(id),
  commitment TEXT NOT NULL UNIQUE,
  leaf_index INT NOT NULL,
  merkle_root TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS merkle_roots (
  root TEXT PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES organizations(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS encryption_keys (
  id UUID PRIMARY KEY,
  key_version TEXT NOT NULL UNIQUE,
  encrypted_key_material TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  active BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS nullifiers (
  nullifier_hash TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS complaints (
  id UUID PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES organizations(id),
  encrypted_data TEXT NOT NULL,
  encrypted_key TEXT,
  category TEXT NOT NULL DEFAULT 'other' CHECK (category IN ('fraud', 'harassment', 'safety', 'corruption', 'other')),
  complaint_status TEXT NOT NULL DEFAULT 'SUBMITTED' CHECK (complaint_status IN ('SUBMITTED', 'UNDER_REVIEW', 'INVESTIGATING', 'RESOLVED', 'DISMISSED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS complaint_updates (
  id UUID PRIMARY KEY,
  complaint_id UUID NOT NULL REFERENCES complaints(id),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS complaint_hashes (
  complaint_id UUID PRIMARY KEY REFERENCES complaints(id),
  hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS org_audit_logs (
  id UUID PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES organizations(id),
  actor_id TEXT,
  action TEXT NOT NULL CHECK (action IN ('VIEW_TIMELINE', 'UPDATE_COMPLAINT', 'EXPORT_DATA')),
  complaint_id UUID,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS export_jobs (
  id UUID PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES organizations(id),
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
  filters JSONB NOT NULL,
  file_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reporter_sessions (
  complaint_id UUID PRIMARY KEY REFERENCES complaints(id),
  reporter_secret TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reporter_messages (
  id UUID PRIMARY KEY,
  complaint_id UUID NOT NULL REFERENCES complaints(id),
  sender_type TEXT NOT NULL CHECK (sender_type IN ('reporter', 'investigator')),
  encrypted_message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversation_keys (
  complaint_id UUID PRIMARY KEY REFERENCES complaints(id),
  encrypted_key_for_reporter TEXT NOT NULL,
  encrypted_key_for_investigator TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS complaint_evidence (
  id UUID PRIMARY KEY,
  complaint_id UUID NOT NULL REFERENCES complaints(id),
  file_path TEXT NOT NULL,
  encrypted_key TEXT NOT NULL,
  scan_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (scan_status IN ('PENDING', 'SAFE', 'REJECTED')),
  scan_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION prevent_complaint_delete()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'complaints are append-only and cannot be deleted';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS complaints_no_delete ON complaints;
CREATE TRIGGER complaints_no_delete
BEFORE DELETE ON complaints
FOR EACH ROW
EXECUTE FUNCTION prevent_complaint_delete();

CREATE OR REPLACE FUNCTION enforce_complaint_immutable_fields()
RETURNS trigger AS $$
BEGIN
  IF OLD.encrypted_data <> NEW.encrypted_data
     OR OLD.org_id <> NEW.org_id
     OR OLD.created_at <> NEW.created_at
     OR OLD.category <> NEW.category
     OR OLD.encrypted_key IS DISTINCT FROM NEW.encrypted_key THEN
    RAISE EXCEPTION 'immutable complaint fields cannot be modified';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS complaints_immutable_update ON complaints;
CREATE TRIGGER complaints_immutable_update
BEFORE UPDATE ON complaints
FOR EACH ROW
EXECUTE FUNCTION enforce_complaint_immutable_fields();

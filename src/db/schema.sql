CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES organizations(id),
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('EMPLOYEE', 'ORG_ADMIN', 'ORG_STAFF', 'HR', 'MANAGER', 'REGIONAL_OFFICER')),
  password_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Backward-compatible migration for older databases where users table
-- was created before password_hash/created_at/new roles existed.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_hash TEXT;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'users'
      AND constraint_type = 'CHECK'
      AND constraint_name = 'users_role_check'
  ) THEN
    ALTER TABLE users DROP CONSTRAINT users_role_check;
  END IF;
END $$;

ALTER TABLE users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('EMPLOYEE', 'ORG_ADMIN', 'ORG_STAFF', 'HR', 'MANAGER', 'REGIONAL_OFFICER'));

-- Organization directory used ONLY for OTP routing.
-- This table is the only place where employee identifiers map to official emails.
-- Complaints never reference this table.
CREATE TABLE IF NOT EXISTS org_employees (
  id UUID PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES organizations(id),
  employee_identifier TEXT NOT NULL, -- employee id OR email entered by employee
  official_email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, employee_identifier)
);

-- Short-lived OTP challenges. Does NOT grant access to complaints directly.
CREATE TABLE IF NOT EXISTS otp_challenges (
  id UUID PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES organizations(id),
  employee_identifier TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One-time eligibility receipts created after OTP verification.
-- Contains no employee identifier and is consumed when commitment is registered.
CREATE TABLE IF NOT EXISTS otp_verification_receipts (
  receipt_hash TEXT PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES organizations(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
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
  complaint_status TEXT NOT NULL DEFAULT 'SUBMITTED' CHECK (complaint_status IN ('SUBMITTED', 'UNDER_REVIEW', 'INVESTIGATING', 'RESOLVED', 'REJECTED')),
  visibility_status TEXT NOT NULL DEFAULT 'PENDING_APPROVAL' CHECK (visibility_status IN ('PENDING_APPROVAL', 'APPROVED', 'REJECTED')),
  nullifier_hash TEXT UNIQUE,
  merkle_root TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE complaints
  DROP COLUMN IF EXISTS reporter_profile_hash;

CREATE TABLE IF NOT EXISTS complaint_approvals (
  id UUID PRIMARY KEY,
  complaint_id UUID NOT NULL REFERENCES complaints(id),
  authority_role TEXT NOT NULL CHECK (authority_role IN ('HR', 'MANAGER', 'REGIONAL_OFFICER')),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  decided_at TIMESTAMPTZ
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
  action TEXT NOT NULL CHECK (action IN ('VIEW_TIMELINE', 'UPDATE_COMPLAINT', 'EXPORT_DATA', 'APPROVE_COMPLAINT', 'REJECT_COMPLAINT', 'CREATE_COMPLAINT', 'VIEW_COMPLAINT', 'RESOLVE_COMPLAINT')),
  complaint_id UUID,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  previous_hash TEXT,
  hash TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS org_audit_logs_org_time_idx ON org_audit_logs (org_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS otp_challenges_org_expires_idx ON otp_challenges (org_id, expires_at DESC);
CREATE INDEX IF NOT EXISTS otp_verification_receipts_expires_idx ON otp_verification_receipts (expires_at DESC);

-- Escalation tracking (bias control automation).
CREATE TABLE IF NOT EXISTS complaint_escalations (
  id UUID PRIMARY KEY,
  complaint_id UUID NOT NULL REFERENCES complaints(id),
  org_id UUID NOT NULL REFERENCES organizations(id),
  reason TEXT NOT NULL CHECK (reason IN ('TIMEOUT_48H', 'PATTERN_MATCH')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (complaint_id, reason)
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

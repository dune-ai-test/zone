-- Zone — Cloudflare D1 schema
-- The Pages Function also creates these tables on first use.
-- Run this in the D1 dashboard console if you prefer to create them up front.

CREATE TABLE IF NOT EXISTS zone_data (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS zone_audit (
  id TEXT PRIMARY KEY,
  event TEXT NOT NULL,
  at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS zone_audit_at ON zone_audit(at DESC);

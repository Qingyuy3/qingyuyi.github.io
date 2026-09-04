ALTER TABLE counters ADD COLUMN expires_at INTEGER NOT NULL DEFAULT 0;
CREATE INDEX counters_expiry ON counters(expires_at);

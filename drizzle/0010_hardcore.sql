CREATE TABLE IF NOT EXISTS hardcore_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  payload TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS hardcore_runs (
  id TEXT PRIMARY KEY,
  outcome TEXT NOT NULL,
  finished_at INTEGER NOT NULL,
  payload TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS hardcore_runs_finished_idx ON hardcore_runs (finished_at DESC);
CREATE INDEX IF NOT EXISTS hardcore_runs_outcome_finished_idx ON hardcore_runs (outcome, finished_at DESC);

CREATE TABLE IF NOT EXISTS hardcore_sync_nonces (
  nonce TEXT PRIMARY KEY,
  expires_at INTEGER NOT NULL
);

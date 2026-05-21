CREATE TABLE IF NOT EXISTS oem_library_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  index_json TEXT NOT NULL,
  storage_backend TEXT NOT NULL DEFAULT 'd1',
  updated_by_email TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS oem_library_objects (
  path TEXT PRIMARY KEY,
  content_base64 TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  size_bytes INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO oem_library_state (id, index_json, storage_backend, updated_by_email, updated_at)
VALUES (1, '{"companies":[]}', 'd1', 'system', CURRENT_TIMESTAMP);

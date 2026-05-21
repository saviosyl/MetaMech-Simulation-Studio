CREATE TABLE IF NOT EXISTS oem_library_file_metadata (
  path TEXT PRIMARY KEY,
  r2_key TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  size_bytes INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

UPDATE oem_library_state
SET storage_backend = 'r2', updated_at = CURRENT_TIMESTAMP
WHERE id = 1;

PRAGMA foreign_keys = ON;

ALTER TABLE assets ADD COLUMN lifecycle_state TEXT;

UPDATE assets
SET lifecycle_state = CASE
  WHEN deleted_at IS NOT NULL THEN 'deleted'
  WHEN status = 'archived' THEN 'archived'
  WHEN status = 'published' AND visible_in_runtime_library = 1 THEN 'live'
  WHEN status = 'published' THEN 'internal'
  ELSE 'draft'
END
WHERE lifecycle_state IS NULL;

CREATE INDEX IF NOT EXISTS idx_assets_lifecycle_state ON assets(lifecycle_state);

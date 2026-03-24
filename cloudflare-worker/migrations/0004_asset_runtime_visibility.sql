PRAGMA foreign_keys = ON;

ALTER TABLE assets ADD COLUMN visible_in_runtime_library INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_assets_visible_in_runtime_library ON assets(visible_in_runtime_library);

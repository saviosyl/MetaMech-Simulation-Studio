PRAGMA foreign_keys = ON;

ALTER TABLE assets ADD COLUMN asset_type TEXT NOT NULL DEFAULT 'static';
ALTER TABLE assets ADD COLUMN template_id TEXT;
ALTER TABLE assets ADD COLUMN parameter_values TEXT NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_assets_asset_type ON assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_assets_template_id ON assets(template_id);

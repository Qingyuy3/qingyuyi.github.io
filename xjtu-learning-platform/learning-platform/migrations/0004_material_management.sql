-- Existing materials remain published. Upload lifecycle stays separate from visibility.
ALTER TABLE uploads ADD COLUMN visibility TEXT NOT NULL DEFAULT 'published'
 CHECK(visibility IN ('published','hidden','trashed','deleting','deleted'));
ALTER TABLE uploads ADD COLUMN material_version INTEGER NOT NULL DEFAULT 0;
ALTER TABLE uploads ADD COLUMN material_updated_at INTEGER;
CREATE INDEX uploads_material_visibility ON uploads(kind,status,visibility,completed_at);

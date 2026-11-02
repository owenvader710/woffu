-- STAGING ONLY: public small previews. Do not upload confidential footage.
-- Large assets are shared through restricted Drive links rather than Free Storage.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-files', 'project-files', true, 5242880,
  ARRAY['image/jpeg','image/png','image/webp','application/pdf']::text[]
)
ON CONFLICT (id) DO UPDATE
  SET public=true, file_size_limit=5242880,
      allowed_mime_types=EXCLUDED.allowed_mime_types;

UPDATE storage.buckets
SET file_size_limit=5242880,
    allowed_mime_types=ARRAY['image/jpeg','image/png','image/webp','application/pdf']::text[]
WHERE id='team-notices';

UPDATE storage.buckets
SET file_size_limit=2097152,
    allowed_mime_types=ARRAY['image/jpeg','image/png','image/webp']::text[]
WHERE id='avatars';

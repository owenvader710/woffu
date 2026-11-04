-- Display names are provided by the team leader when creating invitations.
-- Nullable for legacy invitations; new invitations are validated by the API.
ALTER TABLE public.invites ADD COLUMN IF NOT EXISTS display_name text;
ALTER TABLE public.invites
  ADD CONSTRAINT invites_display_name_length
  CHECK (display_name IS NULL OR (char_length(btrim(display_name)) BETWEEN 1 AND 120));

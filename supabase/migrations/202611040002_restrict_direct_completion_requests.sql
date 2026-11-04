-- Enforce start-before-completion at the table boundary, including direct REST inserts.
-- NOT VALID deliberately preserves historical approved TODO -> COMPLETED requests;
-- PostgreSQL still enforces this constraint for newly inserted/updated rows.
ALTER TABLE public.status_change_requests
  ADD CONSTRAINT status_requests_must_start_before_completion
  CHECK (NOT (from_status = 'TODO' AND to_status = 'COMPLETED')) NOT VALID;

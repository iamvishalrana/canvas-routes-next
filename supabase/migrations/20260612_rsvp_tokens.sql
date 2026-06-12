-- RSVP tokens for event invitation flow
CREATE TABLE IF NOT EXISTS rsvp_tokens (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token           UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  application_id  UUID REFERENCES applications(id) ON DELETE CASCADE,
  event_name      TEXT NOT NULL,
  expires_at      TIMESTAMPTZ NOT NULL,
  confirmed_at    TIMESTAMPTZ,
  answers         JSONB,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE (application_id, event_name)
);

CREATE INDEX IF NOT EXISTS rsvp_tokens_token_idx         ON rsvp_tokens (token);
CREATE INDEX IF NOT EXISTS rsvp_tokens_application_idx   ON rsvp_tokens (application_id);
CREATE INDEX IF NOT EXISTS rsvp_tokens_event_name_idx    ON rsvp_tokens (event_name);

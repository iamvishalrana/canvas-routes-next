-- WTET Awards voting — one ballot per registrant email, upserted on resubmit.
CREATE TABLE IF NOT EXISTS public.wtet_awards_votes (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email          TEXT        NOT NULL UNIQUE,
  voter_name     TEXT        NOT NULL,
  most_beautiful TEXT        NOT NULL,
  best_driver    TEXT        NOT NULL,
  best_energy    TEXT        NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.wtet_awards_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "block_direct_client_access" ON public.wtet_awards_votes
  USING (false) WITH CHECK (false);

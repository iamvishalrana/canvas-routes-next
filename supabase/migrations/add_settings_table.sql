-- Run in Supabase SQL Editor
CREATE TABLE IF NOT EXISTS public.settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Only service role can read/write (no RLS needed, accessed via admin client only)

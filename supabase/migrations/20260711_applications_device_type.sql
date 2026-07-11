-- Device classification (iOS / iPadOS / Android / Windows / macOS / Linux /
-- Other) captured server-side from the User-Agent on every public
-- application/registration write. Latest submission wins.
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS device_type TEXT;

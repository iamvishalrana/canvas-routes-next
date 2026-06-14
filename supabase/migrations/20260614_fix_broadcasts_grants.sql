-- broadcasts table was created with RLS but no grants — service_role inserts silently fail
GRANT ALL ON TABLE public.broadcasts TO service_role;

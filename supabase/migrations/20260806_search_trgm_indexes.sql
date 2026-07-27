-- Every admin search (global search /api/admin/search, Members page) uses
-- `column ilike '%term%'` — a leading wildcard, which a plain B-tree index
-- can never use (idx_members_email etc. only help exact/prefix lookups).
-- Every one of these was a full sequential scan. pg_trgm's GIN trigram
-- indexes are built for exactly this pattern and make ilike substring
-- search fast regardless of table size.
create extension if not exists pg_trgm;

create index if not exists idx_members_name_trgm       on public.members      using gin (name gin_trgm_ops);
create index if not exists idx_members_email_trgm      on public.members      using gin (email gin_trgm_ops);
create index if not exists idx_members_phone_trgm      on public.members      using gin (phone gin_trgm_ops);
create index if not exists idx_members_instagram_trgm  on public.members      using gin (instagram gin_trgm_ops);
create index if not exists idx_members_car_make_trgm   on public.members      using gin (car_make gin_trgm_ops);
create index if not exists idx_members_car_model_trgm  on public.members      using gin (car_model gin_trgm_ops);
create index if not exists idx_members_car_year_trgm   on public.members      using gin (car_year gin_trgm_ops);
-- Matches the exact `cars::text` cast /api/admin/search filters on for
-- license-plate search within the cars JSONB array.
create index if not exists idx_members_cars_text_trgm  on public.members      using gin ((cars::text) gin_trgm_ops);

create index if not exists idx_applications_name_trgm      on public.applications using gin (name gin_trgm_ops);
create index if not exists idx_applications_email_trgm     on public.applications using gin (email gin_trgm_ops);
create index if not exists idx_applications_phone_trgm     on public.applications using gin (phone gin_trgm_ops);
create index if not exists idx_applications_instagram_trgm on public.applications using gin (instagram gin_trgm_ops);
create index if not exists idx_applications_car_make_trgm  on public.applications using gin (car_make gin_trgm_ops);
create index if not exists idx_applications_car_model_trgm on public.applications using gin (car_model gin_trgm_ops);
create index if not exists idx_applications_car_year_trgm  on public.applications using gin (car_year gin_trgm_ops);
create index if not exists idx_applications_notes_trgm     on public.applications using gin (notes gin_trgm_ops);
create index if not exists idx_applications_more_trgm      on public.applications using gin (more gin_trgm_ops);

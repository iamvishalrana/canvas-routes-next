alter table members
  add column if not exists notes text,
  add column if not exists admin_notes text;

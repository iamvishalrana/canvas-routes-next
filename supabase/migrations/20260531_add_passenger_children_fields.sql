alter table applications
  add column if not exists passengers text,
  add column if not exists has_children text,
  add column if not exists children_ages text;

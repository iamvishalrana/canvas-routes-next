create table if not exists unsubscribed_emails (
  email text primary key,
  unsubscribed_at timestamptz default now() not null
);

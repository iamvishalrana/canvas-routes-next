-- applications.email is the upsert conflict key and queried in 10+ route files
CREATE UNIQUE INDEX IF NOT EXISTS idx_applications_email ON public.applications(email);

-- members.email is looked up for bidirectional sync in 3 route files
CREATE UNIQUE INDEX IF NOT EXISTS idx_members_email ON public.members(email);

-- contacts.application_id is the upsert conflict key
CREATE INDEX IF NOT EXISTS idx_contacts_application_id ON public.contacts(application_id);

-- members.join_date is used for ORDER BY in the main members list
CREATE INDEX IF NOT EXISTS idx_members_join_date ON public.members(join_date);

-- members.membership_status is filtered in admin dashboard queries
CREATE INDEX IF NOT EXISTS idx_members_status ON public.members(membership_status);

-- announcements.published is filtered in the RLS policy and portal queries
CREATE INDEX IF NOT EXISTS idx_announcements_published ON public.announcements(published);

-- rsvp_tokens created in 20260612_rsvp_tokens.sql had no GRANT statements
-- service_role needs ALL to operate on tokens from admin routes
GRANT ALL ON TABLE public.rsvp_tokens TO service_role;
GRANT SELECT ON TABLE public.rsvp_tokens TO authenticated;

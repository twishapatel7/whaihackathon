-- Run this in Supabase → SQL Editor if you already ran schema.sql
-- and just need to add the review_text column without dropping existing data.
alter table review_sessions
  add column if not exists review_text text;

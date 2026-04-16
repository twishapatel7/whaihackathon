create extension if not exists pgcrypto;

create table if not exists calls (
  id uuid primary key default gen_random_uuid(),
  vapi_call_id text unique not null,
  hotel_name text not null,
  phone_number text,
  status text default 'completed',
  transcript jsonb,
  structured_review jsonb,
  created_at timestamptz default now()
);

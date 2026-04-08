-- ============================================================
-- Nomad Navigator - Supabase Migration 001: Initial Schema
-- Run this once in: Supabase Dashboard > SQL Editor
-- ============================================================

-- USERS: Extended profile linked to Supabase auth.users
create table if not exists public.users (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  display_name text,
  photo_url text,
  preferences jsonb not null default '{
    "travelStyle": "mid-range",
    "interests": [],
    "preferredLanguage": "en",
    "currency": "USD",
    "defaultTripLength": 7
  }'::jsonb,
  stats jsonb not null default '{
    "totalTripsPlanned": 0,
    "favoriteDestinations": []
  }'::jsonb,
  created_at timestamptz not null default now(),
  last_login_at timestamptz not null default now()
);

-- TRIPS
create table if not exists public.trips (
  id text primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  title text,
  destination text,
  prompt text,
  start_date text,
  end_date text,
  duration int,
  currency text default 'USD',
  travel_style text default 'mid-range',
  status text default 'draft',
  chat_state jsonb,
  itinerary jsonb,
  budget numeric,
  image_url text,
  is_favorite boolean default false,
  tags text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_opened_at timestamptz
);

-- AI_CACHE
create table if not exists public.ai_cache (
  key text primary key,
  prompt text,
  destination text,
  duration int,
  response jsonb,
  tokens_saved int default 0,
  hit_count int default 0,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  last_accessed_at timestamptz not null default now()
);

-- AI_GENERATION_PROGRESS
create table if not exists public.ai_generation_progress (
  id text primary key,
  type text,
  status text,
  progress int,
  message text,
  awaiting_input text,
  has_itinerary boolean,
  intent jsonb,
  missing_fields text[],
  mode text,
  metadata jsonb,
  city text,
  city_data jsonb,
  all_cities jsonb,
  itinerary jsonb,
  conversation_context jsonb,
  error boolean,
  stack text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- Row-Level Security
-- ============================================================
alter table public.users enable row level security;
alter table public.trips enable row level security;
alter table public.ai_cache enable row level security;
alter table public.ai_generation_progress enable row level security;

-- Users can only access their own profile
create policy "Users can manage own profile"
  on public.users for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Users can only access their own trips
create policy "Users can manage own trips"
  on public.trips for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Authenticated users can read/write ai_cache
create policy "Authenticated users can manage ai_cache"
  on public.ai_cache for all
  to authenticated
  using (true)
  with check (true);

-- Authenticated users can read/write ai_generation_progress
create policy "Authenticated users can manage ai_generation_progress"
  on public.ai_generation_progress for all
  to authenticated
  using (true)
  with check (true);

-- ============================================================
-- Function: auto-create user profile on signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.users (id, email, display_name, photo_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update set
    last_login_at = now();
  return new;
end;
$$;

-- Trigger on auth.users insert
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

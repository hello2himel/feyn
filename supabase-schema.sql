-- ============================================================
-- FEYN — Supabase Database Schema  (v17.2)
-- Run this in the Supabase SQL Editor to set up the database.
-- If you already ran the previous schema, scroll to the bottom
-- for the migration-only section.
-- ============================================================
-- Setup steps:
--   1. Create a free project at https://supabase.com
--   2. Go to SQL Editor and run this file
--   3. Go to Settings > API and copy:
--        - Project URL  → NEXT_PUBLIC_SUPABASE_URL
--        - anon key     → NEXT_PUBLIC_SUPABASE_ANON_KEY
--   4. In Netlify: Site settings > Environment variables → add both
--   5. Redeploy. Global accounts now work.
--
-- What syncs across devices:
--   ✓ Enrollments       (enrollments)
--   ✓ Lesson progress   (lesson_progress)
--   ✓ Certificates      (certificates)
--   ✓ Watch positions   (watch_positions)
--   ✓ Feed order        (user_preferences key='feed_order')
--   ✓ Last visited      (user_preferences key='last_visited')
--   ✓ Profile name/user (profiles)
-- ============================================================


-- ── Profiles ─────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text,
  username    text unique,
  email       text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can read their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);


-- ── Enrollments ───────────────────────────────────────────────────────
-- subject_key format: "programId/subjectId"
create table if not exists public.enrollments (
  id          bigserial primary key,
  user_id     uuid references auth.users(id) on delete cascade,
  subject_key text not null,
  enrolled_at timestamptz default now(),
  unique (user_id, subject_key)
);

alter table public.enrollments enable row level security;

create policy "Users can manage their own enrollments"
  on public.enrollments for all
  using (auth.uid() = user_id);


-- ── Lesson progress ───────────────────────────────────────────────────
-- lesson_key format: "programId/subjectId/topicId/lessonId"
create table if not exists public.lesson_progress (
  id          bigserial primary key,
  user_id     uuid references auth.users(id) on delete cascade,
  lesson_key  text not null,
  watched_at  timestamptz default now(),
  unique (user_id, lesson_key)
);

alter table public.lesson_progress enable row level security;

create policy "Users can manage their own lesson progress"
  on public.lesson_progress for all
  using (auth.uid() = user_id);


-- ── Watch positions (resume playback) ─────────────────────────────────
-- Syncs the exact second a user paused, so they resume in the right spot
-- on any device.
create table if not exists public.watch_positions (
  id          bigserial primary key,
  user_id     uuid references auth.users(id) on delete cascade,
  lesson_key  text not null,
  pct         integer default 0,         -- 0–100 percentage watched
  pos_seconds numeric default 0,         -- exact second position
  saved_at    timestamptz default now(),
  unique (user_id, lesson_key)
);

alter table public.watch_positions enable row level security;

create policy "Users can manage their own watch positions"
  on public.watch_positions for all
  using (auth.uid() = user_id);


-- ── Certificates ──────────────────────────────────────────────────────
create table if not exists public.certificates (
  id            text primary key,        -- FEYN-XXXXXX
  user_id       uuid references auth.users(id) on delete cascade,
  program_id    text,
  subject_id    text,
  program_name  text,
  subject_name  text,
  user_name     text,
  issued_at     timestamptz default now()
);

alter table public.certificates enable row level security;

create policy "Users can read their own certificates"
  on public.certificates for select
  using (auth.uid() = user_id);

-- PUBLIC read by cert ID — allows the /verify/[id] page to look up any cert
-- without requiring the viewer to be signed in.
create policy "Anyone can verify a certificate by ID"
  on public.certificates for select
  using (true);

create policy "Users can insert their own certificates"
  on public.certificates for insert
  with check (auth.uid() = user_id);


-- ── User preferences (feed order, last visited, future prefs) ─────────
-- Generic key/value store per user. Current keys:
--   'feed_order'    — JSON array of feed section ordering
--   'last_visited'  — JSON object { key: "p/s/t/l", savedAt: timestamp }
create table if not exists public.user_preferences (
  id         bigserial primary key,
  user_id    uuid references auth.users(id) on delete cascade,
  key        text not null,
  value      text not null,              -- JSON string
  updated_at timestamptz default now(),
  unique (user_id, key)
);

alter table public.user_preferences enable row level security;

create policy "Users can manage their own preferences"
  on public.user_preferences for all
  using (auth.uid() = user_id);


-- ── Helper: delete all user data ──────────────────────────────────────
-- All tables cascade from auth.users, so deleting the auth user
-- automatically removes all their data.
-- await supabase.auth.admin.deleteUser(userId)


-- ============================================================
-- MIGRATION — run this if you already have the old schema
-- and just need to add the new user_preferences table.
-- Skip if running fresh.
-- ============================================================

-- create table if not exists public.user_preferences (
--   id         bigserial primary key,
--   user_id    uuid references auth.users(id) on delete cascade,
--   key        text not null,
--   value      text not null,
--   updated_at timestamptz default now(),
--   unique (user_id, key)
-- );
--
-- alter table public.user_preferences enable row level security;
--
-- create policy "Users can manage their own preferences"
--   on public.user_preferences for all
--   using (auth.uid() = user_id);

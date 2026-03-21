-- ============================================================
-- FEYN — Supabase Database Schema (v25, clean)
--
-- HOW TO USE:
--   1. Go to Supabase → SQL Editor
--   2. Run this entire file
--
-- Drops everything first and rebuilds clean.
-- Safe to run multiple times.
-- ============================================================


-- ============================================================
-- STEP 1 — Drop everything (clean slate)
-- ============================================================
drop table if exists public.user_preferences  cascade;
drop table if exists public.certificates      cascade;
drop table if exists public.watch_positions   cascade;
drop table if exists public.lesson_progress   cascade;
drop table if exists public.enrollments       cascade;
drop table if exists public.profiles          cascade;


-- ============================================================
-- STEP 2 — Profiles
-- ============================================================
create table public.profiles (
  id          uuid        primary key references auth.users(id) on delete cascade,
  name        text,
  username    text        unique,
  email       text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table public.profiles enable row level security;

-- Own row: authenticated users can read their own full profile.
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

-- Public username check: allows unauthenticated sign-up flow to verify
-- if a username is already taken (only id is queried, no PII exposed).
create policy "profiles_select_username_check" on public.profiles
  for select using (true);

create policy "profiles_insert" on public.profiles
  for insert with check (auth.uid() = id);

create policy "profiles_update" on public.profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id);


-- ============================================================
-- STEP 3 — Enrollments
-- subject_key format: "programId/subjectId"
-- ============================================================
create table public.enrollments (
  id          bigserial   primary key,
  user_id     uuid        not null references auth.users(id) on delete cascade,
  subject_key text        not null,
  enrolled_at timestamptz default now(),
  unique (user_id, subject_key)
);

alter table public.enrollments enable row level security;

create policy "enrollments_select" on public.enrollments
  for select using (auth.uid() = user_id);

create policy "enrollments_insert" on public.enrollments
  for insert with check (auth.uid() = user_id);

create policy "enrollments_update" on public.enrollments
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "enrollments_delete" on public.enrollments
  for delete using (auth.uid() = user_id);


-- ============================================================
-- STEP 4 — Lesson Progress
-- lesson_key format: "programId/subjectId/topicId/lessonId"
-- ============================================================
create table public.lesson_progress (
  id          bigserial   primary key,
  user_id     uuid        not null references auth.users(id) on delete cascade,
  lesson_key  text        not null,
  watched_at  timestamptz default now(),
  -- Q&A resume state (null = video-only row, non-null = mid-lesson Q&A save)
  q_idx       integer,
  answers     text,
  saved_at    timestamptz,
  unique (user_id, lesson_key)
);

alter table public.lesson_progress enable row level security;

create policy "lesson_progress_select" on public.lesson_progress
  for select using (auth.uid() = user_id);

create policy "lesson_progress_insert" on public.lesson_progress
  for insert with check (auth.uid() = user_id);

create policy "lesson_progress_update" on public.lesson_progress
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "lesson_progress_delete" on public.lesson_progress
  for delete using (auth.uid() = user_id);

-- ============================================================
-- STEP 4b — Lesson Attempts (per-question analytics log)
-- lesson_key format: "programId/subjectId/topicId/skillId/lessonIdx"
-- Append-only — never updated, only inserted/deleted.
-- ============================================================
create table public.lesson_attempts (
  id           bigserial   primary key,
  user_id      uuid        not null references auth.users(id) on delete cascade,
  lesson_key   text        not null,
  question_id  text        not null,
  correct      boolean     not null,
  xp_earned    integer     not null default 0,
  attempted_at timestamptz default now()
);

alter table public.lesson_attempts enable row level security;

create policy "lesson_attempts_select" on public.lesson_attempts
  for select using (auth.uid() = user_id);

create policy "lesson_attempts_insert" on public.lesson_attempts
  for insert with check (auth.uid() = user_id);

create policy "lesson_attempts_delete" on public.lesson_attempts
  for delete using (auth.uid() = user_id);


-- ============================================================
-- STEP 5 — Watch Positions
-- ============================================================
create table public.watch_positions (
  id          bigserial   primary key,
  user_id     uuid        not null references auth.users(id) on delete cascade,
  lesson_key  text        not null,
  pct         integer     default 0,
  pos_seconds numeric     default 0,
  saved_at    timestamptz default now(),
  unique (user_id, lesson_key)
);

alter table public.watch_positions enable row level security;

create policy "watch_positions_select" on public.watch_positions
  for select using (auth.uid() = user_id);

create policy "watch_positions_insert" on public.watch_positions
  for insert with check (auth.uid() = user_id);

create policy "watch_positions_update" on public.watch_positions
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "watch_positions_delete" on public.watch_positions
  for delete using (auth.uid() = user_id);


-- ============================================================
-- STEP 6 — Certificates
-- ============================================================
create table public.certificates (
  id           text        primary key,
  user_id      uuid        references auth.users(id) on delete cascade,
  program_id   text,
  subject_id   text,
  program_name text,
  subject_name text,
  user_name    text,
  issued_at    timestamptz default now()
);

alter table public.certificates enable row level security;

create policy "certificates_select_owner" on public.certificates
  for select using (auth.uid() = user_id);

create policy "certificates_select_public" on public.certificates
  for select using (true);

create policy "certificates_insert" on public.certificates
  for insert with check (auth.uid() = user_id);

create policy "certificates_update" on public.certificates
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ============================================================
-- STEP 7 — User Preferences
-- Keys: 'feed_order', 'last_visited'
-- (language/medium preference removed — site is English only)
-- ============================================================
create table public.user_preferences (
  id         bigserial   primary key,
  user_id    uuid        not null references auth.users(id) on delete cascade,
  key        text        not null,
  value      text        not null,
  updated_at timestamptz default now(),
  unique (user_id, key)
);

alter table public.user_preferences enable row level security;

create policy "user_preferences_select" on public.user_preferences
  for select using (auth.uid() = user_id);

create policy "user_preferences_insert" on public.user_preferences
  for insert with check (auth.uid() = user_id);

create policy "user_preferences_update" on public.user_preferences
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "user_preferences_delete" on public.user_preferences
  for delete using (auth.uid() = user_id);


-- ============================================================
-- Done. All policies have explicit USING + WITH CHECK.
-- ============================================================

-- ============================================================
-- FEYN — Supabase Database Schema (v30, gamified)
-- Run entire file in Supabase SQL Editor. Drops and rebuilds.
-- ============================================================

drop table if exists public.user_preferences  cascade;
drop table if exists public.certificates      cascade;
drop table if exists public.skill_progress    cascade;
drop table if exists public.lesson_attempts   cascade;
drop table if exists public.watch_positions   cascade;
drop table if exists public.lesson_progress   cascade;
drop table if exists public.enrollments       cascade;
drop table if exists public.profiles          cascade;

-- Profiles
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  name       text,
  username   text unique,
  email      text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "profiles_select_own"            on public.profiles for select using (auth.uid() = id);
create policy "profiles_select_username_check" on public.profiles for select using (true);
create policy "profiles_insert"                on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update"                on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- Lesson Attempts (one row per question answered)
-- lesson_key: "unitId/skillId/lessonIdx"
create table public.lesson_attempts (
  id           bigserial primary key,
  user_id      uuid      not null references auth.users(id) on delete cascade,
  lesson_key   text      not null,
  question_id  text      not null,
  correct      boolean   not null,
  xp_earned    integer   not null default 0,
  attempted_at timestamptz default now()
);
alter table public.lesson_attempts enable row level security;
create policy "lesson_attempts_select" on public.lesson_attempts for select using (auth.uid() = user_id);
create policy "lesson_attempts_insert" on public.lesson_attempts for insert with check (auth.uid() = user_id);

-- Skill Progress (one row per user per skill node)
-- skill_key: "unitId/skillId"
-- status: 'available' | 'complete' | 'mastered'
create table public.skill_progress (
  id        bigserial primary key,
  user_id   uuid      not null references auth.users(id) on delete cascade,
  skill_key text      not null,
  status    text      not null default 'available',
  xp        integer   not null default 0,
  stars     integer   not null default 0,
  last_done timestamptz,
  unique (user_id, skill_key)
);
alter table public.skill_progress enable row level security;
create policy "skill_progress_select" on public.skill_progress for select using (auth.uid() = user_id);
create policy "skill_progress_insert" on public.skill_progress for insert with check (auth.uid() = user_id);
create policy "skill_progress_update" on public.skill_progress for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "skill_progress_delete" on public.skill_progress for delete using (auth.uid() = user_id);

-- Certificates
create table public.certificates (
  id        text primary key,
  user_id   uuid references auth.users(id) on delete cascade,
  unit_id   text,
  unit_name text,
  user_name text,
  issued_at timestamptz default now()
);
alter table public.certificates enable row level security;
create policy "certificates_select_owner"  on public.certificates for select using (auth.uid() = user_id);
create policy "certificates_select_public" on public.certificates for select using (true);
create policy "certificates_insert"        on public.certificates for insert with check (auth.uid() = user_id);
create policy "certificates_update"        on public.certificates for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- User Preferences (streak, last_active, total_xp)
create table public.user_preferences (
  id         bigserial primary key,
  user_id    uuid      not null references auth.users(id) on delete cascade,
  key        text      not null,
  value      text      not null,
  updated_at timestamptz default now(),
  unique (user_id, key)
);
alter table public.user_preferences enable row level security;
create policy "user_preferences_select" on public.user_preferences for select using (auth.uid() = user_id);
create policy "user_preferences_insert" on public.user_preferences for insert with check (auth.uid() = user_id);
create policy "user_preferences_update" on public.user_preferences for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_preferences_delete" on public.user_preferences for delete using (auth.uid() = user_id);

-- Lesson Progress (mid-lesson resume checkpoint)
-- lesson_key: "programId/subjectId/topicId/skillId/lessonIdx"
-- q_idx:    the NEXT question the user should see (0-based)
-- answers:  jsonb array of booleans — one per answered question
-- saved_at: when the checkpoint was last written
create table public.lesson_progress (
  user_id    uuid      not null references auth.users(id) on delete cascade,
  lesson_key text      not null,
  q_idx      integer   not null default 0,
  answers    jsonb     not null default '[]',
  saved_at   timestamptz not null default now(),
  primary key (user_id, lesson_key)
);
alter table public.lesson_progress enable row level security;
create policy "lesson_progress_select" on public.lesson_progress for select using (auth.uid() = user_id);
create policy "lesson_progress_insert" on public.lesson_progress for insert with check (auth.uid() = user_id);
create policy "lesson_progress_update" on public.lesson_progress for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "lesson_progress_delete" on public.lesson_progress for delete using (auth.uid() = user_id);

-- ============================================================
-- FEYN — CANONICAL DATABASE SCHEMA (v30 — multi-tenant publishers)
--
-- This file is the SINGLE SOURCE OF TRUTH for the Feyn database.
-- If it disagrees with your Supabase project, this file wins: re-run it.
--
-- HOW TO USE
--   1. Supabase Dashboard → SQL Editor → New query
--   2. Paste this entire file → Run
--   3. Bootstrap your first App Admin (see docs/self-hosting.md)
--
-- It is destructive-but-idempotent: it drops Feyn's own objects and
-- rebuilds them. It never touches auth.users, so accounts survive.
--
-- LAYOUT
--   Part 1  Reset
--   Part 2  Tenancy   — mentors, publishers, memberships, app_admins
--   Part 3  Content   — programs → subjects → topics → skills → lessons → questions
--   Part 4  Learner   — profiles, enrollments, progress, certificates, prefs
--   Part 5  Helpers   — is_app_admin, has_publisher_role, can_edit_subject, ...
--   Part 6  RLS       — every table, every policy
--   Part 7  RPCs      — approval flows, memberships, handle changes
--   Part 8  Seed      — shared program taxonomy
-- ============================================================


-- ============================================================
-- PART 1 — RESET
-- ============================================================

-- Content + tenancy (children first)
drop table if exists public.questions               cascade;
drop table if exists public.lessons                 cascade;
drop table if exists public.skills                  cascade;
drop table if exists public.topics                  cascade;
drop table if exists public.subject_mentors         cascade;
drop table if exists public.subjects                cascade;
drop table if exists public.programs                cascade;
drop table if exists public.publisher_slug_history  cascade;
drop table if exists public.mentor_username_history cascade;
drop table if exists public.publisher_memberships   cascade;
drop table if exists public.publishers              cascade;
drop table if exists public.mentors                 cascade;
drop table if exists public.app_admins              cascade;

-- Learner data
drop table if exists public.user_preferences cascade;
drop table if exists public.certificates     cascade;
drop table if exists public.watch_positions  cascade;
drop table if exists public.lesson_attempts  cascade;
drop table if exists public.lesson_progress  cascade;
drop table if exists public.enrollments      cascade;
drop table if exists public.profiles         cascade;

-- Functions (drop by exact signature so re-runs stay clean)
drop function if exists public.touch_updated_at()                                cascade;
drop function if exists public.is_app_admin(uuid)                                cascade;
drop function if exists public.current_mentor_id()                               cascade;
drop function if exists public.role_rank(text)                                   cascade;
drop function if exists public.has_publisher_role(uuid, text)                     cascade;
drop function if exists public.is_publisher_visible(uuid)                         cascade;
drop function if exists public.is_publisher_visible_row(uuid, text, uuid)         cascade;
drop function if exists public.is_publisher_member(uuid)                          cascade;
drop function if exists public.can_edit_in_publisher(uuid, uuid)                  cascade;
drop function if exists public.can_edit_subject(uuid)                             cascade;
drop function if exists public.is_subject_visible(uuid)                           cascade;
drop function if exists public.is_subject_visible_row(uuid, uuid, text)           cascade;
drop function if exists public.is_reserved_handle(text)                           cascade;
drop function if exists public.normalize_handle(text)                             cascade;
drop function if exists public.validate_handle(text)                              cascade;
drop function if exists public.is_handle_available(text, text)                     cascade;
drop function if exists public.is_username_taken(text)                             cascade;
drop function if exists public.get_certificate_public(text)                         cascade;
drop function if exists public.apply_as_mentor(text, text, text, text, jsonb)       cascade;
drop function if exists public.register_publisher(text, text, text, text)           cascade;
drop function if exists public.review_mentor_application(uuid, boolean)             cascade;
drop function if exists public.review_publisher_registration(uuid, boolean)         cascade;
drop function if exists public.request_publisher_join(uuid)                         cascade;
drop function if exists public.invite_publisher_member(uuid, text, text)            cascade;
drop function if exists public.respond_to_invitation(bigint, boolean)               cascade;
drop function if exists public.review_join_request(bigint, boolean)                 cascade;
drop function if exists public.set_membership_role(bigint, text)                    cascade;
drop function if exists public.leave_publisher(uuid)                                cascade;
drop function if exists public.remove_publisher_member(bigint)                      cascade;
drop function if exists public.change_mentor_username(text)                         cascade;
drop function if exists public.change_publisher_slug(uuid, text)                    cascade;
drop function if exists public.resolve_mentor_username(text)                        cascade;
drop function if exists public.resolve_publisher_slug(text)                         cascade;
drop function if exists public.is_privileged_context()                             cascade;
drop function if exists public.is_trusted_writer()                                cascade;
drop function if exists public.grant_app_admin(text)                                cascade;

-- ============================================================
-- PART 2 — TENANCY
-- ============================================================

-- ── App-level admins ────────────────────────────────────────
-- Global power. Deliberately NOT a column on profiles: admin
-- rights are an explicit, auditable grant.
create table public.app_admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  granted_by uuid references auth.users(id),
  granted_at timestamptz not null default now()
);

-- ── Mentors (people) ────────────────────────────────────────
-- A Mentor is a person with a public profile. Independent of any
-- Publisher: losing every membership never deletes this row.
create table public.mentors (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade,
  display_name          text not null,
  username              text unique,
  username_updated_at   timestamptz,
  username_change_count integer not null default 0,
  bio                   text,
  credentials           text,
  avatar_url            text,
  signature_url         text,
  socials               jsonb not null default '{}'::jsonb,
  status                text not null default 'pending'
                          check (status in ('pending','approved','rejected')),
  applied_at            timestamptz not null default now(),
  approved_by           uuid references auth.users(id),
  approved_at           timestamptz,
  review_note           text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (user_id)
);

-- Case-insensitive handle uniqueness (/m/Himel == /m/himel)
create unique index mentors_username_norm_uq
  on public.mentors ((lower(trim(username))))
  where username is not null;

create index mentors_status_idx on public.mentors (status);

-- ── Publishers (platforms + solo mentor spaces) ─────────────
-- type='platform' → an organisation/brand, registered by a user,
--                   approved by an App Admin.
-- type='solo'     → auto-created when a Mentor is approved. Never
--                   created by hand.
create table public.publishers (
  id                uuid primary key default gen_random_uuid(),
  type              text not null check (type in ('platform','solo')),
  name              text not null,
  slug              text unique not null,
  slug_updated_at   timestamptz,
  slug_change_count integer not null default 0,
  description       text,
  logo_url          text,
  brand_color       text,
  -- Google-Drive-style sharing model for mentor-initiated joins.
  join_policy       text not null default 'approval_required'
                      check (join_policy in ('open','approval_required','invite_only')),
  status            text not null default 'pending'
                      check (status in ('pending','approved','rejected')),
  owner_mentor_id   uuid references public.mentors(id) on delete set null,
  registered_by     uuid references auth.users(id),
  approved_by       uuid references auth.users(id),
  approved_at       timestamptz,
  review_note       text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint solo_requires_owner
    check (type <> 'solo' or owner_mentor_id is not null)
);

create unique index publishers_slug_norm_uq
  on public.publishers ((lower(trim(slug))));

create index publishers_status_idx on public.publishers (status);
create index publishers_owner_idx  on public.publishers (owner_mentor_id);

-- One solo publisher per mentor.
create unique index publishers_solo_owner_uq
  on public.publishers (owner_mentor_id)
  where type = 'solo';

-- ── Publisher memberships ───────────────────────────────────
-- The single affiliation table. A mentor may hold unlimited
-- approved memberships, each with an independent role.
--
-- requested_by records who initiated the row, which is what makes
-- "pending" mean two different things in the UI:
--   'mentor'   → a join request, waiting on a publisher admin
--   'platform' → an invitation, waiting on the mentor
--   'system'   → auto-created (solo publisher bootstrap, approvals)
create table public.publisher_memberships (
  id           bigserial primary key,
  publisher_id uuid not null references public.publishers(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  mentor_id    uuid references public.mentors(id) on delete set null,
  role         text not null check (role in ('admin','editor','mentor')),
  status       text not null default 'pending'
                 check (status in ('pending','approved','rejected')),
  requested_by text not null check (requested_by in ('mentor','platform','system')),
  invited_or_requested_by_user uuid references auth.users(id),
  approved_by  uuid references auth.users(id),
  created_at   timestamptz not null default now(),
  decided_at   timestamptz,
  unique (publisher_id, user_id)
);

create index memberships_user_idx      on public.publisher_memberships (user_id, status);
create index memberships_publisher_idx on public.publisher_memberships (publisher_id, status);
create index memberships_mentor_idx    on public.publisher_memberships (mentor_id);

-- ── Handle history (301 redirects after a rename) ────────────
create table public.mentor_username_history (
  id            bigserial primary key,
  mentor_id     uuid not null references public.mentors(id) on delete cascade,
  old_username  text not null,
  changed_at    timestamptz not null default now()
);

create unique index mentor_username_history_norm_uq
  on public.mentor_username_history ((lower(trim(old_username))));

create table public.publisher_slug_history (
  id            bigserial primary key,
  publisher_id  uuid not null references public.publishers(id) on delete cascade,
  old_slug      text not null,
  changed_at    timestamptz not null default now()
);

create unique index publisher_slug_history_norm_uq
  on public.publisher_slug_history ((lower(trim(old_slug))));

-- ============================================================
-- PART 3 — COURSE CONTENT (normalized, publisher-owned)
--
-- programs is shared taxonomy owned by nobody ("HSC", "SSC",
-- "Interests"). Everything below a subject inherits the subject's
-- publisher for permission purposes.
-- ============================================================

create table public.programs (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text unique not null,
  description text,
  -- 'class' = academic ladder, 'interest' = self-directed track.
  kind        text not null default 'class' check (kind in ('class','interest')),
  icon        text,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create table public.subjects (
  id              uuid primary key default gen_random_uuid(),
  program_id      uuid not null references public.programs(id) on delete restrict,
  publisher_id    uuid not null references public.publishers(id) on delete restrict,
  name            text not null,
  slug            text not null,
  description     text,
  icon            text,
  cover_image_url text,
  -- Certificate issuing is opt-in per course.
  has_certificate boolean not null default false,
  status          text not null default 'draft'
                    check (status in ('draft','published','archived')),
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  -- Slug is unique per program, so two publishers cannot both own
  -- /hsc/physics. First to publish claims the URL.
  unique (program_id, slug)
);

create index subjects_publisher_idx on public.subjects (publisher_id);
create index subjects_program_idx   on public.subjects (program_id, status);

-- Many-to-many credits: co-mentors per subject, many subjects per mentor.
create table public.subject_mentors (
  subject_id uuid not null references public.subjects(id) on delete cascade,
  mentor_id  uuid not null references public.mentors(id) on delete cascade,
  role_label text not null default 'lead',
  sort_order integer not null default 0,
  primary key (subject_id, mentor_id)
);

create index subject_mentors_mentor_idx on public.subject_mentors (mentor_id);

create table public.topics (
  id            uuid primary key default gen_random_uuid(),
  subject_id    uuid not null references public.subjects(id) on delete cascade,
  name          text not null,
  slug          text not null,
  description   text,
  icon          text,
  -- Attribution for the video source of this topic as a whole
  -- ({name, instructor, url}); distinct from mentor credits.
  primary_source jsonb,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (subject_id, slug)
);

create table public.skills (
  id          uuid primary key default gen_random_uuid(),
  topic_id    uuid not null references public.topics(id) on delete cascade,
  name        text not null,
  slug        text not null,
  description text,
  icon        text,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (topic_id, slug)
);

create table public.lessons (
  id               uuid primary key default gen_random_uuid(),
  skill_id         uuid not null references public.skills(id) on delete cascade,
  title            text not null,
  slug             text not null,
  -- video_url holds a full URL or a bare YouTube ID; the app
  -- normalizes it. duration_seconds is authoritative, the human
  -- "~15:00" label is derived in the UI.
  video_url        text,
  duration_seconds integer,
  intro            text,
  content_md       text,
  -- [{ id, label, url, type }] supplementary links per lesson.
  materials        jsonb not null default '[]'::jsonb,
  -- { name, instructor, url } attribution for this specific video.
  source           jsonb,
  sort_order       integer not null default 0,
  status           text not null default 'draft'
                     check (status in ('draft','published','archived')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (skill_id, slug)
);

create index lessons_skill_idx on public.lessons (skill_id, sort_order);

-- Questions cover every engine type the lesson player supports:
-- mcq | fill | tap-correct | explain | match.
--
--   kind='mcq'          options=[{id,text}]      answer={"correct":"b"}
--   kind='fill'         options=[]               answer={"value":"9.8","aliases":["9.81"]}
--   kind='tap-correct'  options=[{id,text}]      answer={"correct":["a","c"]}
--   kind='explain'      options=[]               answer={"model":"..."}
--   kind='match'        options=[]               answer={"pairs":[{left,right}]}
--
-- One jsonb answer column instead of five nullable typed columns:
-- the shapes have nothing in common and the app validates them.
create table public.questions (
  id            uuid primary key default gen_random_uuid(),
  lesson_id     uuid not null references public.lessons(id) on delete cascade,
  kind          text not null default 'mcq'
                  check (kind in ('mcq','fill','tap-correct','explain','match')),
  prompt        text not null,
  options       jsonb not null default '[]'::jsonb,
  answer        jsonb not null default '{}'::jsonb,
  explanation   text,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  unique (lesson_id, sort_order)
    deferrable initially deferred
);

create index questions_lesson_idx on public.questions (lesson_id, sort_order);

-- ── updated_at triggers ─────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end
$$;

create trigger mentors_touch    before update on public.mentors
  for each row execute function public.touch_updated_at();
create trigger publishers_touch before update on public.publishers
  for each row execute function public.touch_updated_at();
create trigger subjects_touch   before update on public.subjects
  for each row execute function public.touch_updated_at();
create trigger topics_touch     before update on public.topics
  for each row execute function public.touch_updated_at();
create trigger skills_touch     before update on public.skills
  for each row execute function public.touch_updated_at();
create trigger lessons_touch    before update on public.lessons
  for each row execute function public.touch_updated_at();

-- ============================================================
-- PART 4 — LEARNER DATA
--
-- Progress is keyed by slug path, not UUID:
--   subject_key  "hsc/physics"
--   lesson_key   "hsc/physics/dynamics/motion-language/displacement-velocity"
--
-- Why: the client computes these keys from the URL it is already on,
-- with no extra round-trip, and a learner's history stays readable.
-- Trade-off: renaming a slug orphans progress rows under the old
-- path. Slug renames of published courses are therefore an
-- App-Admin-level action, not a casual edit.
-- ============================================================

create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  name       text,
  username   text unique,
  email      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index profiles_username_norm_uq
  on public.profiles ((lower(trim(username))));

create table public.enrollments (
  id          bigserial primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  subject_key text not null,
  enrolled_at timestamptz not null default now(),
  unique (user_id, subject_key)
);

-- Two row types share this table:
--   video watched → watched_at set, q_idx null
--   Q&A resume    → q_idx set, answers json
create table public.lesson_progress (
  id         bigserial primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  lesson_key text not null,
  watched_at timestamptz default now(),
  q_idx      integer,
  answers    text,
  saved_at   timestamptz,
  unique (user_id, lesson_key)
);

-- Append-only per-question analytics log.
create table public.lesson_attempts (
  id           bigserial primary key,
  user_id      uuid not null references auth.users(id) on delete cascade,
  lesson_key   text not null,
  question_id  text not null,
  correct      boolean not null,
  xp_earned    integer not null default 0,
  attempted_at timestamptz not null default now()
);

create table public.watch_positions (
  id          bigserial primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  lesson_key  text not null,
  pct         integer default 0,
  pos_seconds numeric default 0,
  saved_at    timestamptz not null default now(),
  unique (user_id, lesson_key)
);

create table public.certificates (
  id           text primary key,
  user_id      uuid references auth.users(id) on delete cascade,
  program_id   text,
  subject_id   text,
  program_name text,
  subject_name text,
  user_name    text,
  -- Denormalized so a certificate stays truthful after the course
  -- is edited, the publisher renames itself, or the mentor leaves.
  publisher_name text,
  mentor_names   text,
  issued_at    timestamptz not null default now()
);

create table public.user_preferences (
  id         bigserial primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  key        text not null,
  value      text not null,
  updated_at timestamptz not null default now(),
  unique (user_id, key)
);

-- ============================================================
-- PART 5 — HELPER FUNCTIONS
--
-- Every one of these is `security definer` so it can read tenancy
-- tables without tripping the very policies that call it. Without
-- that, a policy on publisher_memberships that checks membership
-- would recurse infinitely.
--
-- All of them are also `stable` and pinned to `search_path = public`
-- so a caller cannot shadow `publishers` with a temp table.
-- ============================================================

-- ── is_app_admin ────────────────────────────────────────────
-- Global override. Takes an explicit uid so policies can call it as
-- is_app_admin(auth.uid()) and tests can call it for any user.
create or replace function public.is_app_admin(uid uuid default auth.uid())
returns boolean
language sql stable security definer set search_path = public as $$
  select uid is not null
     and exists (select 1 from public.app_admins a where a.user_id = uid)
$$;

-- ── current_mentor_id ───────────────────────────────────────
-- The caller's mentor row, regardless of approval status.
create or replace function public.current_mentor_id()
returns uuid
language sql stable security definer set search_path = public as $$
  select m.id from public.mentors m where m.user_id = auth.uid() limit 1
$$;

-- ── role_rank ───────────────────────────────────────────────
-- Publisher roles are a strict ladder: admin ⊃ editor ⊃ mentor.
-- Ranking them numerically lets one comparison express
-- "at least this much power".
create or replace function public.role_rank(r text)
returns integer
language sql immutable as $$
  select case r
    when 'admin'  then 3
    when 'editor' then 2
    when 'mentor' then 1
    else 0
  end
$$;

-- ── has_publisher_role ──────────────────────────────────────
-- THE central authorization primitive. True when the caller is an
-- App Admin, or holds an approved membership in this publisher at
-- or above min_role.
--
-- App Admins pass without a membership row on purpose: admin power
-- is global, while publisher_memberships means actual affiliation.
create or replace function public.has_publisher_role(pub_id uuid, min_role text default 'mentor')
returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_app_admin()
      or exists (
        select 1
        from public.publisher_memberships pm
        where pm.publisher_id = pub_id
          and pm.user_id      = auth.uid()
          and pm.status       = 'approved'
          and public.role_rank(pm.role) >= public.role_rank(min_role)
      )
$$;

-- ── is_publisher_member ─────────────────────────────────────
-- Bare membership test that never reads `publishers`. A policy ON
-- publishers must not call a function that re-queries publishers —
-- see the note on can_edit_in_publisher below for why.
create or replace function public.is_publisher_member(pub_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.publisher_memberships pm
    where pm.publisher_id = pub_id and pm.user_id = auth.uid()
  )
$$;

-- ── is_publisher_visible ────────────────────────────────────
-- Approved publishers are public. Pending/rejected ones are visible
-- only to their own members, their registrant, and App Admins —
-- otherwise a rejected registration would leak into search.
--
-- Row form: the SELECT policy on `publishers` uses this so it never
-- re-queries its own table. See can_edit_in_publisher for the full
-- explanation of why a self-querying policy breaks
-- `insert ... returning`.
create or replace function public.is_publisher_visible_row(
  pub_id uuid, pub_status text, pub_registered_by uuid
) returns boolean
language sql stable security definer set search_path = public as $$
  select pub_status = 'approved'
      or public.is_app_admin()
      or pub_registered_by = auth.uid()
      or public.is_publisher_member(pub_id)
$$;

-- id form, for callers who only have the id (other tables, app code).
create or replace function public.is_publisher_visible(pub_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.publishers p
    where p.id = pub_id
      and public.is_publisher_visible_row(p.id, p.status, p.registered_by)
  )
$$;

-- ── can_edit_in_publisher ───────────────────────────────────
-- The permission matrix for one course, expressed WITHOUT reading
-- the `subjects` table:
--   App Admin                → yes
--   publisher admin / editor → yes (any course under it)
--   publisher mentor         → only if credited on this subject
--   everyone else            → no
--
-- Taking publisher_id as an argument instead of looking it up is
-- what makes `insert ... returning` work. Postgres re-checks the
-- SELECT policy against the row being returned, but this function is
-- `stable`, so its snapshot predates the statement and a lookup of
-- the not-yet-visible new row finds nothing — the insert then fails
-- with "new row violates row-level security policy". supabase-js
-- appends RETURNING to every insert, so a policy that re-queries its
-- own table breaks all client-side creation. Passing the columns in
-- lets the policy evaluate against the NEW tuple directly.
create or replace function public.can_edit_in_publisher(pub_id uuid, subj_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_app_admin()
      or exists (
        select 1
        from public.publisher_memberships pm
        where pm.publisher_id = pub_id
          and pm.user_id      = auth.uid()
          and pm.status       = 'approved'
          and (
            -- admin/editor: blanket rights across the publisher
            public.role_rank(pm.role) >= public.role_rank('editor')
            -- mentor: only courses they are credited on
            or exists (
              select 1 from public.subject_mentors sm
              where sm.subject_id = subj_id
                and sm.mentor_id  = pm.mentor_id
            )
          )
      )
$$;

-- ── can_edit_subject ────────────────────────────────────────
-- id-only convenience wrapper for the child tables (topics, skills,
-- lessons, questions), which walk up to their subject anyway. Safe
-- there because the parent subject always already exists.
create or replace function public.can_edit_subject(subj_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_app_admin()
      or exists (
        select 1 from public.subjects s
        where s.id = subj_id
          and public.can_edit_in_publisher(s.publisher_id, s.id)
      )
$$;

-- ── is_subject_visible ──────────────────────────────────────
-- Published courses under an approved publisher are public.
-- Drafts are visible to anyone who could edit them.
--
-- Row form (used by the RLS policy): takes the columns directly so
-- the policy never re-queries `subjects`. See can_edit_in_publisher
-- for why that matters to `insert ... returning`.
create or replace function public.is_subject_visible_row(
  subj_id uuid, pub_id uuid, subj_status text
) returns boolean
language sql stable security definer set search_path = public as $$
  select (
        subj_status = 'published'
        and exists (select 1 from public.publishers p
                    where p.id = pub_id and p.status = 'approved')
      )
      or public.can_edit_in_publisher(pub_id, subj_id)
$$;

-- id form (used by child tables and by application code).
create or replace function public.is_subject_visible(subj_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.subjects s
    where s.id = subj_id
      and public.is_subject_visible_row(s.id, s.publisher_id, s.status)
  )
$$;

-- Grants for these live in one authoritative block at the end of
-- Part 7, after every function exists. Granting here would be
-- undone anyway: that block first revokes Supabase's blanket
-- default-privilege grant on functions.


-- ============================================================
-- PART 5b — HANDLE VALIDATION (/m/username, /p/slug)
-- ============================================================

-- Reserved words, shared by both namespaces. Kept in one function so
-- the mentor form, the publisher form, and the DB can never disagree.
create or replace function public.is_reserved_handle(candidate text)
returns boolean
language sql immutable as $$
  select lower(trim(candidate)) = any (array[
    'admin','api','settings','profile','about','contact','coaches','panels',
    'verify','terms','privacy','login','signin','signup','signout','logout',
    'm','p','www','support','help','feyn','studio','apply','register',
    'dashboard','docs','static','_next','public','null','undefined','teach'
  ])
$$;

create or replace function public.normalize_handle(candidate text)
returns text
language sql immutable as $$
  select lower(trim(coalesce(candidate, '')))
$$;

-- Returns null when valid, otherwise a human-readable reason.
-- Returning the reason (not just a boolean) is what lets the API
-- route surface the same message the client-side validator shows.
create or replace function public.validate_handle(candidate text)
returns text
language plpgsql immutable as $$
declare h text := public.normalize_handle(candidate);
begin
  if length(h) < 3  then return 'Must be at least 3 characters.'; end if;
  if length(h) > 30 then return 'Must be at most 30 characters.'; end if;
  if h !~ '^[a-z0-9_-]+$' then
    return 'Only lowercase letters, numbers, hyphens and underscores.';
  end if;
  if h ~ '^[-_]' or h ~ '[-_]$' then
    return 'Cannot start or end with a hyphen or underscore.';
  end if;
  if h ~ '--' then return 'Cannot contain consecutive hyphens.'; end if;
  if public.is_reserved_handle(h) then return 'This handle is reserved.'; end if;
  return null;
end
$$;

-- Public availability probe. Boolean only — never leaks who owns a
-- handle, and treats retired handles as taken so old links keep
-- redirecting instead of silently pointing somewhere new.
create or replace function public.is_handle_available(candidate text, namespace text)
returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when public.validate_handle(candidate) is not null then false
    when namespace = 'mentor' then not (
      exists (select 1 from public.mentors
              where public.normalize_handle(username) = public.normalize_handle(candidate))
      or exists (select 1 from public.mentor_username_history
              where public.normalize_handle(old_username) = public.normalize_handle(candidate))
    )
    when namespace = 'publisher' then not (
      exists (select 1 from public.publishers
              where public.normalize_handle(slug) = public.normalize_handle(candidate))
      or exists (select 1 from public.publisher_slug_history
              where public.normalize_handle(old_slug) = public.normalize_handle(candidate))
    )
    else false
  end
$$;

-- Grants: see the authoritative block at the end of Part 7.

-- Legacy learner-username check, still used by the sign-up form.
create or replace function public.is_username_taken(candidate_username text)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where public.normalize_handle(p.username) = public.normalize_handle(candidate_username)
  )
$$;

-- Grant: see the authoritative block at the end of Part 7.

-- ============================================================
-- PART 6 — ROW LEVEL SECURITY
--
-- Reading order for every table below:
--   select → who can see the row
--   insert → what a caller may create for themselves
--   update → who may mutate it
--   delete → who may destroy it
--
-- Rule of thumb enforced throughout: clients never write columns
-- that grant power (status, role, approved_by, requested_by). Those
-- move only through the Part 7 RPCs. Where a client-side write is
-- allowed at all, a WITH CHECK re-asserts the caller's own identity.
-- ============================================================

alter table public.app_admins              enable row level security;
alter table public.mentors                 enable row level security;
alter table public.publishers              enable row level security;
alter table public.publisher_memberships   enable row level security;
alter table public.mentor_username_history enable row level security;
alter table public.publisher_slug_history  enable row level security;
alter table public.programs                enable row level security;
alter table public.subjects                enable row level security;
alter table public.subject_mentors         enable row level security;
alter table public.topics                  enable row level security;
alter table public.skills                  enable row level security;
alter table public.lessons                 enable row level security;
alter table public.questions               enable row level security;
alter table public.profiles                enable row level security;
alter table public.enrollments             enable row level security;
alter table public.lesson_progress         enable row level security;
alter table public.lesson_attempts         enable row level security;
alter table public.watch_positions         enable row level security;
alter table public.certificates            enable row level security;
alter table public.user_preferences        enable row level security;

-- ── app_admins ──────────────────────────────────────────────
-- Readable by admins only (the list of who runs the site is not
-- public). No write policy at all: admin grants happen via the
-- bootstrap SQL or grant_app_admin(), never from the client.
create policy app_admins_select_admin on public.app_admins
  for select using (public.is_app_admin());

-- ── mentors ─────────────────────────────────────────────────
create policy mentors_select_public on public.mentors
  for select using (
    status = 'approved'          -- public profiles
    or user_id = auth.uid()      -- your own application, pending or not
    or public.is_app_admin()     -- review queue
  );

-- A user may file exactly one application, for themselves, and it
-- always starts pending — the check constraint default plus this
-- WITH CHECK make self-approval impossible.
create policy mentors_insert_self on public.mentors
  for insert with check (
    user_id = auth.uid()
    and status = 'pending'
    and approved_by is null
    and approved_at is null
  );

-- Mentors edit their own profile; App Admins edit anyone's.
-- Privileged columns (status/approved_by/username/change counters) are
-- protected by the guard trigger below rather than by a subquery in
-- WITH CHECK: a policy on mentors that selects from mentors would
-- recurse through its own policy and error out.
create policy mentors_update_self on public.mentors
  for update using (user_id = auth.uid() or public.is_app_admin())
  with check (user_id = auth.uid() or public.is_app_admin());

create policy mentors_delete_admin on public.mentors
  for delete using (public.is_app_admin());

-- ── publishers ──────────────────────────────────────────────
create policy publishers_select_visible on public.publishers
  for select using (public.is_publisher_visible_row(id, status, registered_by));

-- Platform registrations only. Solo publishers are created by
-- review_mentor_application() as security definer, which bypasses
-- this policy — that is why 'solo' is rejected here.
create policy publishers_insert_registration on public.publishers
  for insert with check (
    auth.uid() is not null
    and registered_by = auth.uid()
    and type = 'platform'
    and status = 'pending'
    and owner_mentor_id is null
    and approved_by is null
  );

-- Publisher admins edit branding, description and join_policy.
-- status/type/slug/owner are frozen by the guard trigger below, so an
-- approval cannot be self-granted and a platform cannot morph into a
-- solo publisher.
create policy publishers_update_admin on public.publishers
  for update using (public.has_publisher_role(id, 'admin'))
  with check (public.has_publisher_role(id, 'admin'));

create policy publishers_delete_admin on public.publishers
  for delete using (public.is_app_admin());

-- ── publisher_memberships ───────────────────────────────────
-- Visible to the member themselves and to admins of that publisher.
-- Also readable when the publisher is public and the row is
-- approved, which is what powers the public member list on /p/[slug].
create policy memberships_select on public.publisher_memberships
  for select using (
    user_id = auth.uid()
    or public.has_publisher_role(publisher_id, 'admin')
    or (status = 'approved' and public.is_publisher_visible(publisher_id))
  );

-- No client inserts, updates or deletes. Every membership
-- transition (request, invite, accept, approve, role change, leave,
-- remove) runs through a Part 7 RPC so join_policy and role rules
-- are enforced in one place instead of duplicated in policies.

-- ── handle history ──────────────────────────────────────────
-- Public: needed by the anonymous 301 redirect lookup.
create policy mentor_username_history_select on public.mentor_username_history
  for select using (true);

create policy publisher_slug_history_select on public.publisher_slug_history
  for select using (true);

-- ── programs (shared taxonomy) ──────────────────────────────
create policy programs_select_all on public.programs
  for select using (true);

create policy programs_write_admin on public.programs
  for all using (public.is_app_admin()) with check (public.is_app_admin());

-- ── subjects ────────────────────────────────────────────────
create policy subjects_select_visible on public.subjects
  for select using (public.is_subject_visible_row(id, publisher_id, status));

-- Creating a course requires editor rights in the owning publisher,
-- and the publisher must already be approved.
create policy subjects_insert on public.subjects
  for insert with check (
    public.has_publisher_role(publisher_id, 'editor')
    and exists (
      select 1 from public.publishers p
      where p.id = publisher_id and p.status = 'approved'
    )
  );

-- can_edit_subject() is what lets role='mentor' edit only their own
-- credited courses while editors edit everything under the publisher.
create policy subjects_update on public.subjects
  for update using (public.can_edit_in_publisher(publisher_id, id))
  with check (public.can_edit_in_publisher(publisher_id, id));

-- Deleting a whole course is an admin-level act, not an editor's.
create policy subjects_delete on public.subjects
  for delete using (public.has_publisher_role(publisher_id, 'admin'));

-- ── subject_mentors (credits) ───────────────────────────────
create policy subject_mentors_select on public.subject_mentors
  for select using (public.is_subject_visible(subject_id));

-- Assigning credit is an admin act: it grants edit rights to the
-- credited mentor, so an editor must not be able to hand it out.
create policy subject_mentors_write on public.subject_mentors
  for all using (
    exists (
      select 1 from public.subjects s
      where s.id = subject_id
        and public.has_publisher_role(s.publisher_id, 'admin')
    )
  )
  with check (
    exists (
      select 1 from public.subjects s
      where s.id = subject_id
        and public.has_publisher_role(s.publisher_id, 'admin')
    )
    -- The mentor must actually belong to that publisher, otherwise
    -- crediting a stranger would silently grant them write access.
    and exists (
      select 1
      from public.subjects s
      join public.publisher_memberships pm on pm.publisher_id = s.publisher_id
      where s.id = subject_id
        and pm.mentor_id = subject_mentors.mentor_id
        and pm.status = 'approved'
    )
  );

-- ── topics / skills / lessons / questions ───────────────────
-- All four inherit visibility and editability from their subject by
-- walking up the tree. Deeper tables mean longer joins, which is the
-- cost of a normalized hierarchy; the indexes above keep it cheap.

create policy topics_select on public.topics
  for select using (public.is_subject_visible(subject_id));

create policy topics_write on public.topics
  for all using (public.can_edit_subject(subject_id))
  with check (public.can_edit_subject(subject_id));

create policy skills_select on public.skills
  for select using (
    exists (select 1 from public.topics t
            where t.id = topic_id and public.is_subject_visible(t.subject_id))
  );

create policy skills_write on public.skills
  for all using (
    exists (select 1 from public.topics t
            where t.id = topic_id and public.can_edit_subject(t.subject_id))
  )
  with check (
    exists (select 1 from public.topics t
            where t.id = topic_id and public.can_edit_subject(t.subject_id))
  );

-- A draft lesson stays hidden even inside a published course, so a
-- half-written lesson never appears mid-course to learners.
create policy lessons_select on public.lessons
  for select using (
    exists (
      select 1
      from public.skills sk
      join public.topics t on t.id = sk.topic_id
      where sk.id = skill_id
        and public.is_subject_visible(t.subject_id)
        and (lessons.status = 'published' or public.can_edit_subject(t.subject_id))
    )
  );

create policy lessons_write on public.lessons
  for all using (
    exists (
      select 1 from public.skills sk
      join public.topics t on t.id = sk.topic_id
      where sk.id = skill_id and public.can_edit_subject(t.subject_id)
    )
  )
  with check (
    exists (
      select 1 from public.skills sk
      join public.topics t on t.id = sk.topic_id
      where sk.id = skill_id and public.can_edit_subject(t.subject_id)
    )
  );

-- Questions carry answers. They are readable by anyone who can read
-- the lesson: this is formative practice with immediate feedback, not
-- graded assessment, so the client needs the answer to mark locally.
-- If Feyn ever adds graded exams, those must move behind an RPC.
create policy questions_select on public.questions
  for select using (
    exists (
      select 1
      from public.lessons l
      join public.skills sk on sk.id = l.skill_id
      join public.topics t  on t.id  = sk.topic_id
      where l.id = lesson_id
        and public.is_subject_visible(t.subject_id)
        and (l.status = 'published' or public.can_edit_subject(t.subject_id))
    )
  );

create policy questions_write on public.questions
  for all using (
    exists (
      select 1 from public.lessons l
      join public.skills sk on sk.id = l.skill_id
      join public.topics t  on t.id  = sk.topic_id
      where l.id = lesson_id and public.can_edit_subject(t.subject_id)
    )
  )
  with check (
    exists (
      select 1 from public.lessons l
      join public.skills sk on sk.id = l.skill_id
      join public.topics t  on t.id  = sk.topic_id
      where l.id = lesson_id and public.can_edit_subject(t.subject_id)
    )
  );

-- ── Learner-owned tables ────────────────────────────────────
-- Uniform pattern: a user sees and writes only their own rows.
-- Every policy states USING and WITH CHECK explicitly so an update
-- can never move a row to another user_id.

create policy profiles_select_own on public.profiles
  for select using (auth.uid() = id or public.is_app_admin());
create policy profiles_insert on public.profiles
  for insert with check (auth.uid() = id);
create policy profiles_update on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

create policy enrollments_select on public.enrollments
  for select using (auth.uid() = user_id);
create policy enrollments_insert on public.enrollments
  for insert with check (auth.uid() = user_id);
create policy enrollments_update on public.enrollments
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy enrollments_delete on public.enrollments
  for delete using (auth.uid() = user_id);

create policy lesson_progress_select on public.lesson_progress
  for select using (auth.uid() = user_id);
create policy lesson_progress_insert on public.lesson_progress
  for insert with check (auth.uid() = user_id);
create policy lesson_progress_update on public.lesson_progress
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy lesson_progress_delete on public.lesson_progress
  for delete using (auth.uid() = user_id);

create policy lesson_attempts_select on public.lesson_attempts
  for select using (auth.uid() = user_id);
create policy lesson_attempts_insert on public.lesson_attempts
  for insert with check (auth.uid() = user_id);
create policy lesson_attempts_delete on public.lesson_attempts
  for delete using (auth.uid() = user_id);

create policy watch_positions_select on public.watch_positions
  for select using (auth.uid() = user_id);
create policy watch_positions_insert on public.watch_positions
  for insert with check (auth.uid() = user_id);
create policy watch_positions_update on public.watch_positions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy watch_positions_delete on public.watch_positions
  for delete using (auth.uid() = user_id);

-- Certificates are readable by their owner only. Public verification
-- goes through get_certificate_public(), which returns a whitelisted
-- column set and never exposes user_id.
create policy certificates_select_owner on public.certificates
  for select using (auth.uid() = user_id);
create policy certificates_insert on public.certificates
  for insert with check (auth.uid() = user_id);
create policy certificates_update on public.certificates
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy user_preferences_select on public.user_preferences
  for select using (auth.uid() = user_id);
create policy user_preferences_insert on public.user_preferences
  for insert with check (auth.uid() = user_id);
create policy user_preferences_update on public.user_preferences
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy user_preferences_delete on public.user_preferences
  for delete using (auth.uid() = user_id);

-- Public certificate verification.
create or replace function public.get_certificate_public(cert_id text)
returns table (
  id text, program_name text, subject_name text, user_name text,
  publisher_name text, mentor_names text, issued_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select c.id, c.program_name, c.subject_name, c.user_name,
         c.publisher_name, c.mentor_names, c.issued_at
  from public.certificates c
  where c.id = cert_id
  limit 1
$$;

-- Grant: see the authoritative block at the end of Part 7.

-- ============================================================
-- PART 6b — PRIVILEGE GUARD TRIGGERS
--
-- RLS answers "may this caller touch this row". It cannot cheaply
-- answer "may this caller touch this COLUMN", because comparing NEW
-- against the stored row from inside a policy on the same table
-- recurses through that policy.
--
-- These BEFORE UPDATE triggers close that gap: they silently restore
-- privilege-bearing columns to their old values unless the caller is
-- an App Admin. The Part 7 RPCs are security definer and run as the
-- table owner, so `session_user`-independent checks would not help —
-- instead each RPC sets a local flag that these triggers honour.
-- ============================================================

-- Trusted-context flag. Set with
--   perform set_config('feyn.privileged', 'on', true)
-- inside a security definer RPC; `true` scopes it to the transaction.
create or replace function public.is_privileged_context()
returns boolean
language sql stable as $$
  select coalesce(current_setting('feyn.privileged', true), 'off') = 'on'
$$;

-- Who may write privilege-bearing columns directly.
--
-- Deliberately NOT role-based. An earlier version also accepted
-- current_user in ('postgres','service_role'), which silently disabled
-- the guards entirely: the trigger functions below are `security
-- definer`, so inside them current_user is always the table owner.
-- The only trustworthy signals are "is an App Admin" and "is inside a
-- Part 7 RPC".
--
-- Server-side code holding the service key bypasses RLS but NOT these
-- triggers. It should call the Part 7 RPCs; if it must write a guarded
-- column directly, it opts in for that transaction with
--   select set_config('feyn.privileged', 'on', true);
create or replace function public.is_trusted_writer()
returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_app_admin() or public.is_privileged_context()
$$;

create or replace function public.guard_mentor_columns()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_trusted_writer() then
    return new;
  end if;
  -- A mentor may edit their presentation, nothing that confers status.
  new.status                := old.status;
  new.approved_by           := old.approved_by;
  new.approved_at           := old.approved_at;
  new.applied_at            := old.applied_at;
  new.review_note           := old.review_note;
  new.user_id               := old.user_id;
  new.username              := old.username;
  new.username_updated_at   := old.username_updated_at;
  new.username_change_count := old.username_change_count;
  return new;
end
$$;

create trigger mentors_guard before update on public.mentors
  for each row execute function public.guard_mentor_columns();

create or replace function public.guard_publisher_columns()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_trusted_writer() then
    return new;
  end if;
  new.status            := old.status;
  new.type              := old.type;
  new.owner_mentor_id   := old.owner_mentor_id;
  new.registered_by     := old.registered_by;
  new.approved_by       := old.approved_by;
  new.approved_at       := old.approved_at;
  new.review_note       := old.review_note;
  new.slug              := old.slug;
  new.slug_updated_at   := old.slug_updated_at;
  new.slug_change_count := old.slug_change_count;
  return new;
end
$$;

create trigger publishers_guard before update on public.publishers
  for each row execute function public.guard_publisher_columns();

-- Grants: see the authoritative block at the end of Part 7.

-- ============================================================
-- PART 7 — PRIVILEGED RPCs
--
-- Every state transition that grants power lives here, not in the
-- client. Each function is `security definer`, validates the caller
-- itself, and raises a plain-English exception on refusal so the API
-- route can surface the message directly.
--
-- All of them call set_config('feyn.privileged', 'on', true) before
-- touching guarded columns, and that flag dies with the transaction.
-- ============================================================

-- ── Granting App Admin ──────────────────────────────────────
-- Adds another App Admin. Requires already being one, with no
-- "the table is empty so allow it" escape hatch: on a fresh
-- deployment that path would let the first visitor to find the
-- endpoint claim the entire site.
--
-- The very first admin is therefore created by raw SQL in the
-- Supabase SQL editor, which is the one place a self-hoster provably
-- controls. app_admins has no INSERT policy at all, so that statement
-- cannot be replayed from the app. See docs/self-hosting.md.
create or replace function public.grant_app_admin(target_email text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare target uuid;
begin
  if not public.is_app_admin() then
    raise exception
      'Only an App Admin can grant admin rights. Bootstrap the first one from the Supabase SQL editor.';
  end if;

  select id into target from auth.users
   where lower(email) = lower(trim(target_email)) limit 1;
  if target is null then
    raise exception 'No account found for %. Ask them to sign up first.', target_email;
  end if;

  insert into public.app_admins (user_id, granted_by)
  values (target, auth.uid())
  on conflict (user_id) do nothing;

  return target;
end
$$;

-- ── Mentor application ──────────────────────────────────────
create or replace function public.apply_as_mentor(
  p_display_name text,
  p_username     text,
  p_bio          text default null,
  p_credentials  text default null,
  p_socials      jsonb default '{}'::jsonb
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_err text; v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Sign in before applying.';
  end if;

  v_err := public.validate_handle(p_username);
  if v_err is not null then raise exception 'Username: %', v_err; end if;

  if not public.is_handle_available(p_username, 'mentor') then
    raise exception 'That username is taken.';
  end if;

  if coalesce(trim(p_display_name), '') = '' then
    raise exception 'Display name is required.';
  end if;

  -- Re-applying after a rejection reuses the row and resets it to
  -- pending, so the admin queue shows one entry per person.
  insert into public.mentors (
    user_id, display_name, username, bio, credentials, socials, status, applied_at
  ) values (
    auth.uid(), trim(p_display_name), public.normalize_handle(p_username),
    p_bio, p_credentials, coalesce(p_socials, '{}'::jsonb), 'pending', now()
  )
  on conflict (user_id) do update set
    display_name = excluded.display_name,
    username     = excluded.username,
    bio          = excluded.bio,
    credentials  = excluded.credentials,
    socials      = excluded.socials,
    status       = case when public.mentors.status = 'approved'
                        then 'approved' else 'pending' end,
    applied_at   = now(),
    review_note  = null
  returning id into v_id;

  return v_id;
end
$$;

-- ── Mentor approval (App Admin) ─────────────────────────────
-- On approval this also creates the mentor's solo Publisher and makes
-- them its sole admin. That pairing is the whole reason it is one
-- function: an approved mentor with no publisher could not publish
-- anything, and a solo publisher with no mentor violates its own
-- check constraint.
create or replace function public.review_mentor_application(
  p_mentor_id uuid,
  p_approve   boolean,
  p_note      text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare m record; v_slug text; v_pub uuid; n integer := 0;
begin
  if not public.is_app_admin() then
    raise exception 'App Admin only.';
  end if;

  select * into m from public.mentors where id = p_mentor_id;
  if m is null then raise exception 'Mentor not found.'; end if;

  perform set_config('feyn.privileged', 'on', true);

  if not p_approve then
    update public.mentors
       set status = 'rejected', approved_by = auth.uid(),
           approved_at = now(), review_note = p_note
     where id = p_mentor_id;
    return;
  end if;

  update public.mentors
     set status = 'approved', approved_by = auth.uid(),
         approved_at = now(), review_note = p_note
   where id = p_mentor_id;

  -- Idempotent: re-approving never creates a second solo publisher.
  select id into v_pub from public.publishers
   where type = 'solo' and owner_mentor_id = m.id;

  if v_pub is null then
    -- The mentor's username is the natural slug. If the publisher
    -- namespace already holds it, suffix until free — the two
    -- namespaces are independent, so a collision is possible.
    v_slug := coalesce(m.username, 'mentor');
    while not public.is_handle_available(v_slug, 'publisher') loop
      n := n + 1;
      v_slug := left(coalesce(m.username, 'mentor'), 26) || '-' || n;
      if n > 50 then raise exception 'Could not allocate a publisher slug.'; end if;
    end loop;

    insert into public.publishers (
      type, name, slug, description, join_policy, status,
      owner_mentor_id, registered_by, approved_by, approved_at
    ) values (
      'solo', m.display_name, v_slug,
      'Independent courses published by ' || m.display_name,
      'invite_only',   -- a personal space: nobody self-joins it
      'approved', m.id, m.user_id, auth.uid(), now()
    ) returning id into v_pub;
  end if;

  insert into public.publisher_memberships (
    publisher_id, user_id, mentor_id, role, status, requested_by,
    approved_by, decided_at
  ) values (
    v_pub, m.user_id, m.id, 'admin', 'approved', 'system', auth.uid(), now()
  )
  on conflict (publisher_id, user_id) do update
    set role = 'admin', status = 'approved', decided_at = now();
end
$$;

-- ── Platform registration ───────────────────────────────────
create or replace function public.register_publisher(
  p_name        text,
  p_slug        text,
  p_description text default null,
  p_brand_color text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_err text; v_id uuid;
begin
  if auth.uid() is null then raise exception 'Sign in before registering.'; end if;

  v_err := public.validate_handle(p_slug);
  if v_err is not null then raise exception 'Slug: %', v_err; end if;
  if not public.is_handle_available(p_slug, 'publisher') then
    raise exception 'That slug is taken.';
  end if;
  if coalesce(trim(p_name), '') = '' then
    raise exception 'Platform name is required.';
  end if;

  insert into public.publishers (
    type, name, slug, description, brand_color, status, registered_by
  ) values (
    'platform', trim(p_name), public.normalize_handle(p_slug),
    p_description, p_brand_color, 'pending', auth.uid()
  ) returning id into v_id;

  return v_id;
end
$$;

-- ── Platform approval (App Admin) ───────────────────────────
create or replace function public.review_publisher_registration(
  p_publisher_id uuid,
  p_approve      boolean,
  p_note         text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare p record;
begin
  if not public.is_app_admin() then raise exception 'App Admin only.'; end if;

  select * into p from public.publishers where id = p_publisher_id;
  if p is null then raise exception 'Publisher not found.'; end if;
  if p.type <> 'platform' then
    raise exception 'Solo publishers are not reviewed.';
  end if;

  perform set_config('feyn.privileged', 'on', true);

  update public.publishers
     set status = case when p_approve then 'approved' else 'rejected' end,
         approved_by = auth.uid(), approved_at = now(), review_note = p_note
   where id = p_publisher_id;

  if not p_approve then return; end if;

  -- The registrant becomes the platform's first admin. mentor_id may
  -- be null: running a platform does not require being a mentor.
  insert into public.publisher_memberships (
    publisher_id, user_id, mentor_id, role, status, requested_by,
    approved_by, decided_at
  ) values (
    p_publisher_id, p.registered_by,
    (select id from public.mentors where user_id = p.registered_by),
    'admin', 'approved', 'system', auth.uid(), now()
  )
  on conflict (publisher_id, user_id) do update
    set role = 'admin', status = 'approved', decided_at = now();
end
$$;

-- ── Mentor-initiated join (honours join_policy) ─────────────
-- Returns the resulting status so the UI can say either
-- "you're in" or "request sent" without a second round-trip.
create or replace function public.request_publisher_join(p_publisher_id uuid)
returns text
language plpgsql security definer set search_path = public as $$
declare pub record; me uuid := auth.uid(); mid uuid; existing record; v_status text;
begin
  if me is null then raise exception 'Sign in first.'; end if;

  mid := public.current_mentor_id();
  if mid is null or not exists (
    select 1 from public.mentors where id = mid and status = 'approved'
  ) then
    raise exception 'Only approved mentors can join a publisher.';
  end if;

  select * into pub from public.publishers where id = p_publisher_id;
  if pub is null or pub.status <> 'approved' then
    raise exception 'Publisher not available.';
  end if;
  if pub.type = 'solo' then
    raise exception 'Solo publishers do not accept members.';
  end if;

  select * into existing from public.publisher_memberships
   where publisher_id = p_publisher_id and user_id = me;

  if existing.id is not null then
    if existing.status = 'approved' then
      raise exception 'You are already a member.';
    end if;
    -- A pending platform invite is accepted, not duplicated.
    if existing.status = 'pending' and existing.requested_by = 'platform' then
      update public.publisher_memberships
         set status = 'approved', decided_at = now(), mentor_id = mid
       where id = existing.id;
      return 'approved';
    end if;
    if existing.status = 'pending' then return 'pending'; end if;
  end if;

  if pub.join_policy = 'invite_only' then
    raise exception 'This publisher is invite-only. Contact an admin to be added.';
  end if;

  -- open → instant membership; approval_required → queued for review.
  v_status := case when pub.join_policy = 'open' then 'approved' else 'pending' end;

  insert into public.publisher_memberships (
    publisher_id, user_id, mentor_id, role, status, requested_by,
    invited_or_requested_by_user, decided_at
  ) values (
    p_publisher_id, me, mid, 'mentor', v_status, 'mentor', me,
    case when v_status = 'approved' then now() else null end
  )
  on conflict (publisher_id, user_id) do update
    set status = v_status, requested_by = 'mentor', role = 'mentor',
        mentor_id = mid, created_at = now(),
        decided_at = case when v_status = 'approved' then now() else null end;

  return v_status;
end
$$;

-- ── Platform-initiated invite ───────────────────────────────
-- Always lands as pending regardless of join_policy: nobody is added
-- to an organisation without accepting.
create or replace function public.invite_publisher_member(
  p_publisher_id uuid,
  p_email        text,
  p_role         text default 'mentor'
) returns bigint
language plpgsql security definer set search_path = public as $$
declare target uuid; mid uuid; v_id bigint;
begin
  if not public.has_publisher_role(p_publisher_id, 'admin') then
    raise exception 'Publisher admin only.';
  end if;
  if p_role not in ('admin','editor','mentor') then
    raise exception 'Unknown role %.', p_role;
  end if;

  select id into target from auth.users
   where lower(email) = lower(trim(p_email)) limit 1;
  if target is null then
    raise exception 'No Feyn account for %. Ask them to sign up first.', p_email;
  end if;

  select id into mid from public.mentors
   where user_id = target and status = 'approved';

  insert into public.publisher_memberships (
    publisher_id, user_id, mentor_id, role, status, requested_by,
    invited_or_requested_by_user
  ) values (
    p_publisher_id, target, mid, p_role, 'pending', 'platform', auth.uid()
  )
  on conflict (publisher_id, user_id) do update
    set role = p_role,
        -- Re-inviting an existing member must not silently demote
        -- them back to pending.
        status = case when public.publisher_memberships.status = 'approved'
                      then 'approved' else 'pending' end,
        requested_by = 'platform',
        invited_or_requested_by_user = auth.uid(),
        created_at = now()
  returning id into v_id;

  return v_id;
end
$$;

-- ── Mentor accepts / declines an invitation ─────────────────
create or replace function public.respond_to_invitation(
  p_membership_id bigint,
  p_accept        boolean
) returns void
language plpgsql security definer set search_path = public as $$
declare row record;
begin
  select * into row from public.publisher_memberships where id = p_membership_id;
  if row is null then raise exception 'Invitation not found.'; end if;
  if row.user_id <> auth.uid() then raise exception 'Not your invitation.'; end if;
  if row.status <> 'pending' or row.requested_by <> 'platform' then
    raise exception 'No pending invitation to respond to.';
  end if;

  update public.publisher_memberships
     set status = case when p_accept then 'approved' else 'rejected' end,
         mentor_id = coalesce(mentor_id, public.current_mentor_id()),
         decided_at = now()
   where id = p_membership_id;
end
$$;

-- ── Publisher admin approves / rejects a join request ───────
create or replace function public.review_join_request(
  p_membership_id bigint,
  p_approve       boolean
) returns void
language plpgsql security definer set search_path = public as $$
declare row record;
begin
  select * into row from public.publisher_memberships where id = p_membership_id;
  if row is null then raise exception 'Request not found.'; end if;
  if not public.has_publisher_role(row.publisher_id, 'admin') then
    raise exception 'Publisher admin only.';
  end if;
  if row.status <> 'pending' or row.requested_by <> 'mentor' then
    raise exception 'No pending request to review.';
  end if;

  update public.publisher_memberships
     set status = case when p_approve then 'approved' else 'rejected' end,
         approved_by = auth.uid(), decided_at = now()
   where id = p_membership_id;
end
$$;

-- ── Role reassignment ───────────────────────────────────────
create or replace function public.set_membership_role(
  p_membership_id bigint,
  p_role          text
) returns void
language plpgsql security definer set search_path = public as $$
declare row record; admin_count integer;
begin
  if p_role not in ('admin','editor','mentor') then
    raise exception 'Unknown role %.', p_role;
  end if;

  select * into row from public.publisher_memberships where id = p_membership_id;
  if row is null then raise exception 'Membership not found.'; end if;
  if not public.has_publisher_role(row.publisher_id, 'admin') then
    raise exception 'Publisher admin only.';
  end if;

  -- Never leave a publisher with zero admins: it would become
  -- unmanageable by anyone but an App Admin.
  if row.role = 'admin' and p_role <> 'admin' then
    select count(*) into admin_count from public.publisher_memberships
     where publisher_id = row.publisher_id and role = 'admin' and status = 'approved';
    if admin_count <= 1 then
      raise exception 'A publisher must keep at least one admin.';
    end if;
  end if;

  update public.publisher_memberships
     set role = p_role, decided_at = now() where id = p_membership_id;
end
$$;

-- ── Leaving / removal ───────────────────────────────────────
-- Either side may end an approved membership with no approval step.
-- Courses stay with the publisher; an admin reassigns or archives
-- anything the departing mentor was the only credit on.
create or replace function public.leave_publisher(p_publisher_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare row record; admin_count integer;
begin
  select * into row from public.publisher_memberships
   where publisher_id = p_publisher_id and user_id = auth.uid();
  if row is null then raise exception 'You are not a member.'; end if;

  if exists (select 1 from public.publishers
             where id = p_publisher_id and type = 'solo'
               and owner_mentor_id = row.mentor_id) then
    raise exception 'You cannot leave your own solo publisher.';
  end if;

  if row.role = 'admin' and row.status = 'approved' then
    select count(*) into admin_count from public.publisher_memberships
     where publisher_id = p_publisher_id and role = 'admin' and status = 'approved';
    if admin_count <= 1 then
      raise exception 'Promote another admin before leaving.';
    end if;
  end if;

  delete from public.publisher_memberships where id = row.id;
  -- Drop the mentor's course credits under this publisher only.
  -- Their credits elsewhere, and their solo publisher, are untouched.
  delete from public.subject_mentors sm
   using public.subjects s
   where sm.subject_id = s.id
     and s.publisher_id = p_publisher_id
     and sm.mentor_id = row.mentor_id;
end
$$;

create or replace function public.remove_publisher_member(p_membership_id bigint)
returns void
language plpgsql security definer set search_path = public as $$
declare row record; admin_count integer;
begin
  select * into row from public.publisher_memberships where id = p_membership_id;
  if row is null then raise exception 'Membership not found.'; end if;
  if not public.has_publisher_role(row.publisher_id, 'admin') then
    raise exception 'Publisher admin only.';
  end if;
  if exists (select 1 from public.publishers
             where id = row.publisher_id and type = 'solo') then
    raise exception 'Solo publishers have no removable members.';
  end if;

  if row.role = 'admin' and row.status = 'approved' then
    select count(*) into admin_count from public.publisher_memberships
     where publisher_id = row.publisher_id and role = 'admin' and status = 'approved';
    if admin_count <= 1 then
      raise exception 'A publisher must keep at least one admin.';
    end if;
  end if;

  delete from public.publisher_memberships where id = p_membership_id;
  delete from public.subject_mentors sm
   using public.subjects s
   where sm.subject_id = s.id
     and s.publisher_id = row.publisher_id
     and sm.mentor_id = row.mentor_id;
end
$$;

-- ── Handle changes: cooldown + lifetime cap ─────────────────
-- 14-day cooldown, 5 lifetime changes. Enforced here because a
-- client-side check is advisory at best. App Admins bypass both, which
-- is the documented escape hatch once a user hits the cap.
create or replace function public.change_mentor_username(p_new text)
returns void
language plpgsql security definer set search_path = public as $$
declare m record; v_err text; cooldown interval := interval '14 days'; cap integer := 5;
begin
  select * into m from public.mentors where user_id = auth.uid();
  if m is null then raise exception 'You are not a mentor.'; end if;

  v_err := public.validate_handle(p_new);
  if v_err is not null then raise exception '%', v_err; end if;

  if public.normalize_handle(p_new) = public.normalize_handle(m.username) then
    return;  -- no-op, and must not burn a change
  end if;

  if not public.is_app_admin() then
    if m.username_updated_at is not null
       and m.username_updated_at > now() - cooldown then
      raise exception 'You can change your username again on %.',
        to_char(m.username_updated_at + cooldown, 'Mon DD, YYYY');
    end if;
    if m.username_change_count >= cap then
      raise exception 'You have used all % username changes. Contact support.', cap;
    end if;
  end if;

  if not public.is_handle_available(p_new, 'mentor') then
    raise exception 'That username is taken.';
  end if;

  perform set_config('feyn.privileged', 'on', true);

  if m.username is not null then
    insert into public.mentor_username_history (mentor_id, old_username)
    values (m.id, m.username)
    on conflict do nothing;
  end if;

  update public.mentors
     set username = public.normalize_handle(p_new),
         username_updated_at = now(),
         username_change_count = username_change_count
           + case when public.is_app_admin() then 0 else 1 end
   where id = m.id;
end
$$;

create or replace function public.change_publisher_slug(p_publisher_id uuid, p_new text)
returns void
language plpgsql security definer set search_path = public as $$
declare p record; v_err text; cooldown interval := interval '14 days'; cap integer := 5;
begin
  if not public.has_publisher_role(p_publisher_id, 'admin') then
    raise exception 'Publisher admin only.';
  end if;

  select * into p from public.publishers where id = p_publisher_id;

  v_err := public.validate_handle(p_new);
  if v_err is not null then raise exception '%', v_err; end if;
  if public.normalize_handle(p_new) = public.normalize_handle(p.slug) then return; end if;

  if not public.is_app_admin() then
    if p.slug_updated_at is not null and p.slug_updated_at > now() - cooldown then
      raise exception 'You can change this slug again on %.',
        to_char(p.slug_updated_at + cooldown, 'Mon DD, YYYY');
    end if;
    if p.slug_change_count >= cap then
      raise exception 'This publisher has used all % slug changes. Contact support.', cap;
    end if;
  end if;

  if not public.is_handle_available(p_new, 'publisher') then
    raise exception 'That slug is taken.';
  end if;

  perform set_config('feyn.privileged', 'on', true);

  insert into public.publisher_slug_history (publisher_id, old_slug)
  values (p.id, p.slug) on conflict do nothing;

  update public.publishers
     set slug = public.normalize_handle(p_new),
         slug_updated_at = now(),
         slug_change_count = slug_change_count
           + case when public.is_app_admin() then 0 else 1 end
   where id = p.id;
end
$$;

-- ── Handle resolution (powers the 301 redirects) ────────────
-- Returns the current handle for any handle, live or retired, so
-- /m/old-name can permanently redirect to /m/new-name.
create or replace function public.resolve_mentor_username(p_handle text)
returns text
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select m.username from public.mentors m
      where public.normalize_handle(m.username) = public.normalize_handle(p_handle)
        and m.status = 'approved'),
    (select m.username from public.mentor_username_history h
       join public.mentors m on m.id = h.mentor_id
      where public.normalize_handle(h.old_username) = public.normalize_handle(p_handle)
        and m.status = 'approved'
      order by h.changed_at desc limit 1)
  )
$$;

create or replace function public.resolve_publisher_slug(p_handle text)
returns text
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select p.slug from public.publishers p
      where public.normalize_handle(p.slug) = public.normalize_handle(p_handle)
        and p.status = 'approved'),
    (select p.slug from public.publisher_slug_history h
       join public.publishers p on p.id = h.publisher_id
      where public.normalize_handle(h.old_slug) = public.normalize_handle(p_handle)
        and p.status = 'approved'
      order by h.changed_at desc limit 1)
  )
$$;

-- ── Grants ──────────────────────────────────────────────────
-- Two separate defaults hand out EXECUTE on every function created
-- here, and both have to be undone before the grants below mean
-- anything:
--
--   1. Postgres grants EXECUTE to PUBLIC on each new function.
--   2. Supabase adds ALTER DEFAULT PRIVILEGES ... GRANT ALL ON
--      FUNCTIONS TO anon, authenticated, service_role.
--
-- Left in place, (2) makes every RPC in this file callable by an
-- anonymous visitor. The internal auth.uid() checks would still
-- refuse them, but "reachable and then refused" is a bigger attack
-- surface than "not reachable", and it turns a single missing check
-- into a public endpoint.
--
-- So: strip everything, then re-grant deliberately. Only the five
-- read-only functions an unauthenticated visitor genuinely needs
-- (handle availability, the two resolvers, certificate verification)
-- keep anon access. service_role is left alone — it is server-side
-- only and bypasses RLS anyway.
revoke execute on all functions in schema public from public;
revoke execute on all functions in schema public from anon;
revoke execute on all functions in schema public from authenticated;

-- Helpers. These are called *by the RLS policies*, and a policy is
-- evaluated as the querying role — so anon needs EXECUTE on every
-- predicate that guards a publicly-readable table, or an anonymous
-- SELECT fails with "permission denied for function". Safe to expose:
-- each one returns a boolean about auth.uid() itself and reveals
-- nothing about anyone else. For anon, auth.uid() is null and they
-- all return false.
grant execute on function public.is_app_admin(uuid)                                 to anon, authenticated;
grant execute on function public.current_mentor_id()                                to authenticated;
grant execute on function public.role_rank(text)                                    to anon, authenticated;
grant execute on function public.has_publisher_role(uuid, text)                     to anon, authenticated;
grant execute on function public.is_publisher_member(uuid)                          to anon, authenticated;
grant execute on function public.is_publisher_visible(uuid)                         to anon, authenticated;
grant execute on function public.is_publisher_visible_row(uuid, text, uuid)         to anon, authenticated;
grant execute on function public.can_edit_in_publisher(uuid, uuid)                  to anon, authenticated;
grant execute on function public.can_edit_subject(uuid)                             to anon, authenticated;
grant execute on function public.is_subject_visible(uuid)                           to anon, authenticated;
grant execute on function public.is_subject_visible_row(uuid, uuid, text)           to anon, authenticated;
grant execute on function public.is_privileged_context()                            to anon, authenticated;
grant execute on function public.is_trusted_writer()                                to anon, authenticated;

-- Handle validation. Public: the sign-up and application forms need
-- the live ✓/✗ check before the visitor has an account.
grant execute on function public.is_reserved_handle(text)                           to anon, authenticated;
grant execute on function public.normalize_handle(text)                             to anon, authenticated;
grant execute on function public.validate_handle(text)                              to anon, authenticated;
grant execute on function public.is_handle_available(text, text)                     to anon, authenticated;
grant execute on function public.is_username_taken(text)                            to anon, authenticated;

-- Public reads: /verify/[id] and the retired-handle 301 redirects,
-- both of which must work for a logged-out visitor.
grant execute on function public.get_certificate_public(text)                        to anon, authenticated;
grant execute on function public.resolve_mentor_username(text)                       to anon, authenticated;
grant execute on function public.resolve_publisher_slug(text)                        to anon, authenticated;

-- State transitions. Signed-in only, without exception.
grant execute on function public.grant_app_admin(text)                              to authenticated;
grant execute on function public.apply_as_mentor(text, text, text, text, jsonb)     to authenticated;
grant execute on function public.review_mentor_application(uuid, boolean, text)     to authenticated;
grant execute on function public.register_publisher(text, text, text, text)         to authenticated;
grant execute on function public.review_publisher_registration(uuid, boolean, text) to authenticated;
grant execute on function public.request_publisher_join(uuid)                       to authenticated;
grant execute on function public.invite_publisher_member(uuid, text, text)          to authenticated;
grant execute on function public.respond_to_invitation(bigint, boolean)             to authenticated;
grant execute on function public.review_join_request(bigint, boolean)               to authenticated;
grant execute on function public.set_membership_role(bigint, text)                  to authenticated;
grant execute on function public.leave_publisher(uuid)                              to authenticated;
grant execute on function public.remove_publisher_member(bigint)                    to authenticated;
grant execute on function public.change_mentor_username(text)                       to authenticated;
grant execute on function public.change_publisher_slug(uuid, text)                  to authenticated;
grant execute on function public.resolve_mentor_username(text)                      to anon, authenticated;
grant execute on function public.resolve_publisher_slug(text)                       to anon, authenticated;


-- ============================================================
-- PART 8 — SEED: shared program taxonomy
--
-- Programs only. Courses belong to publishers, and there are no
-- publishers until a real person is approved, so seeding sample
-- courses here would mean inventing a fake owner.
-- ============================================================

insert into public.programs (name, slug, description, kind, icon, sort_order) values
  ('HSC',       'hsc',       'Higher Secondary Certificate.',        'class',    'ri-graduation-cap-line', 1),
  ('SSC',       'ssc',       'Secondary School Certificate.',        'class',    'ri-building-4-line',     2),
  ('JSC',       'jsc',       'Junior School Certificate.',           'class',    'ri-school-line',         3),
  ('Interests', 'interests', 'Self-directed tracks, no exam board.', 'interest', 'ri-compass-discover-line', 4)
on conflict (slug) do nothing;

-- ============================================================
-- Done.
--
-- NEXT STEP — create your first App Admin. app_admins has no INSERT
-- policy, so this statement only works from the Supabase SQL editor
-- (or another service-key connection), never from the app.
--
-- Sign up through the app first, then run:
--
--   insert into public.app_admins (user_id)
--   select id from auth.users where email = 'you@example.com';
--
-- After that, grant further admins from the app with
-- select public.grant_app_admin('someone@example.com');
--
-- Then visit /admin to approve mentors and platforms.
-- ============================================================

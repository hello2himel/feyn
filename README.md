# Feyn

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-c8a96e.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-14-000000.svg)](https://nextjs.org)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres-3ecf8e.svg)](https://supabase.com)

> *"If you can't explain it simply, you don't understand it well enough."* — Richard Feynman

**Feyn** is a free, video-first learning platform built on the Feynman principle: watch a lesson that builds an idea from scratch, then answer questions that test whether you genuinely understood it — not just whether you watched.

It is also **multi-tenant**. Course content is owned by Publishers — either an organisation or an independent mentor's own space — and mentors can teach under several Publishers at once with a different role in each. Anyone can fork this repository and run their own instance.

Feyn is the educational platform of **STΛRGZR**, a community for students who believe learning should be driven by curiosity, not compliance.

---

## What it does

**For learners**

- Video lessons with comprehension questions after each one — five question types: multiple choice, fill-in, tap-all-correct, explain, and match
- Enrollment, per-lesson progress, resume-where-you-left-off
- Verifiable PDF certificates at 100% course completion, with a QR code and the mentor's signature
- Public certificate verification at `/verify`
- Keyboard-driven search (⌘K), dark and light themes
- Completely free. No paywalls, no ads.

**For mentors and publishers**

- Apply as a mentor at `/apply/mentor` — approval creates your own publishing space automatically
- Register an organisation at `/apply/platform` — you become its first admin
- Public profile at `/m/{username}` listing every course you teach, across every publisher
- Public publisher page at `/p/{slug}` with branding, members and courses
- A course editor that writes straight to the database — topics, skills, lessons, questions
- Google-Drive-style join policies: open, approval-required, or invite-only
- Handle changes keep old links alive with 301 redirects

**For operators**

- Approval queues for mentor applications and platform registrations
- Global override into any publisher without needing a membership row
- 53 row-level-security policies, verified by 173 automated assertions against a real Postgres

---

## Quickstart

```bash
git clone https://github.com/hello2himel/feyn.git
cd feyn
npm install
cp .env.example .env.local     # add your Supabase URL + publishable key
npm run dev
```

Then:

1. Create a free [Supabase](https://database.new) project.
2. Run [`docs/schema.sql`](docs/schema.sql) in its SQL editor.
3. Make yourself the first App Admin — one SQL statement, since nobody starts as one:

   ```sql
   insert into public.app_admins (user_id)
   select id from auth.users where email = 'you@example.com';
   ```

4. Sign up in your app, apply as a mentor at `/apply/mentor` (or start from `/teach`), approve yourself at `/admin`, and create your first course from `/studio`.

The full walkthrough — including Netlify deployment and auth redirect URLs — is in **[docs/self-hosting.md](docs/self-hosting.md)**.

The catalogue starts empty. That is deliberate: there is no sample course in the schema because every course needs a real owner.

---

## Deploying

Push to GitHub, import the repository on Netlify, and add the same two environment variables. Build settings come from `netlify.toml`, which enables `@netlify/plugin-nextjs` — required for the incremental static regeneration and API routes this app depends on.

Course pages revalidate every 60 seconds, so published edits appear without a redeploy.

---

## How it fits together

```
programs → subjects → topics → skills → lessons → questions
              ↑
          publishers ← publisher_memberships → mentors
```

A **Publisher** owns courses and has members with roles (`admin`, `editor`, `mentor`). A **Mentor** is a person, independent of any membership, who can belong to many Publishers at once. Permissions are computed per request as `isAppAdmin OR membership.role for that publisher_id` — never stored as a flat role.

| Actor | Can edit |
|---|---|
| App Admin | Everything, everywhere |
| Publisher `admin` | That publisher's settings, members and all its courses |
| Publisher `editor` | All courses under that publisher |
| Publisher `mentor` | Only courses they are credited on |
| Regular user | Nothing — browse, enroll, track progress |

Read **[ARCHITECTURE.md](ARCHITECTURE.md)** for the model in full, with an ERD and a diagram per approval flow.

---

## Tech

Next.js 14 (Pages Router) · React 18 · Supabase (Postgres + Auth) · jsPDF for certificates · plain CSS, no framework · Netlify

## Documentation

| Document | What's in it |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | The Publisher/Mentor model, ERD, permission matrix, approval flows, code layout |
| [docs/schema.sql](docs/schema.sql) | Canonical schema — the single source of truth |
| [docs/permissions.md](docs/permissions.md) | All 53 RLS policies in plain English plus SQL |
| [docs/self-hosting.md](docs/self-hosting.md) | Fork → Supabase → first admin → Netlify |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Local setup, conventions, how to propose a schema change |

## Verifying a change

```bash
npm run build          # must pass
npm run pg:start       # throwaway Postgres 18 — no Docker, no sudo
npm run schema:apply   # → "schema: APPLIED CLEAN"
npm run test:schema    # → "173 passed, 0 failed"
npm run pg:stop
```

The schema tests need a real Postgres because they assert on RLS evaluation, `security definer` semantics and trigger side effects. **Never point them at a real Supabase project** — `docs/schema.sql` begins by dropping every Feyn table.

## Contributing

Pull requests welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) first — especially the two schema rules that exist because breaking them cost real debugging time.

## License

[AGPL-3.0](LICENSE). If you run a modified version as a network service, you must make your source available to its users.

---

Built with love by [STΛRGZR](https://hello2himel.netlify.app).

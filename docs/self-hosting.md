# Self-hosting Feyn

A complete walkthrough for running your own Feyn instance. Everything here uses free tiers.

You need: a GitHub account, a [Supabase](https://supabase.com) account, a [Netlify](https://netlify.com) account, and Node 20+ locally.

---

## 1. Fork and clone

```bash
git clone https://github.com/YOUR-USERNAME/feyn.git
cd feyn
npm install
```

## 2. Create a Supabase project

1. [database.new](https://database.new) → create a project.
2. Pick a region near your users and save the database password somewhere safe.
3. Wait for provisioning (a minute or two).

## 3. Apply the schema

1. In your project: **SQL Editor** → **New query**.
2. Paste the entire contents of [`docs/schema.sql`](schema.sql) and run it.

It should finish without errors and creates 20 tables, 53 RLS policies and 38 functions.

> **`docs/schema.sql` starts by dropping every Feyn table.** That makes it safe to re-run while setting up, and destructive if you run it on a project with real data. Back up first if you have any.

## 4. Create the first App Admin

Nobody starts as an admin, and there is deliberately **no** way to become the first one from inside the app. On a freshly deployed fork, an in-app bootstrap would let whoever finds the endpoint first claim your site.

So the first admin is created with SQL, in the one place you provably control:

1. Sign up in your own app first (step 7) so a row exists in `auth.users`, **or** create the user in **Authentication → Users → Add user**.
2. **SQL Editor** → run, with your own email:

```sql
insert into public.app_admins (user_id)
select id from auth.users where email = 'you@example.com';
```

`app_admins` has no INSERT policy at all, so this statement cannot be replayed from the app or from a browser. Once you are an admin you can grant others from `/admin`.

To confirm:

```sql
select u.email from public.app_admins a join auth.users u on u.id = a.user_id;
```

## 5. Get your API keys

**Project Settings → API Keys → "API Keys" tab** (not Legacy):

- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- **Publishable key** (`sb_publishable_…`) → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

The publishable key is meant to be public; it carries no privileges of its own and every table is protected by row-level security.

The **secret** key (`sb_secret_…`) bypasses RLS entirely. Feyn does not require it — leave it unset unless you add server-side features that must act beyond the caller's own rights.

## 6. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in the URL and publishable key. `.env.local` is gitignored; keep it that way.

## 7. Run it

```bash
npm run dev
```

Open http://localhost:3000, sign up, then do step 4 if you have not yet.

The catalogue is empty at this point — that is expected. There is no sample course in the schema because every course needs a real owner.

## 8. Seed your first course

1. Add a program (shared taxonomy, owned by nobody). **SQL Editor**:

```sql
insert into public.programs (name, slug, kind, description, icon, sort_order)
values ('HSC', 'hsc', 'class', 'Higher Secondary Certificate.', 'ri-graduation-cap-line', 1);
```

App admins can also manage programs from the app; SQL is just faster for the first one.

2. Become a mentor: go to `/apply/mentor`, submit the form, then approve yourself at `/admin`. Approval auto-creates your solo publisher with you as its only admin.

3. Create the course: `/studio` → your publisher → **Manage** → **New course**. Add topics, skills, lessons and questions, then set the course status to **published**.

4. It appears on the public site within a minute (see ISR below).

To publish as an organisation instead, use `/apply/platform` and approve it at `/admin`; you become its first admin and can invite mentors from its dashboard.

## 9. Deploy to Netlify

1. **Add new site → Import an existing project** → pick your fork.
2. Build settings come from `netlify.toml`; leave them alone.
3. **Site configuration → Environment variables** → add the same two variables from `.env.local`.
4. Deploy.

`netlify.toml` enables `@netlify/plugin-nextjs`, which is what makes ISR and API routes work. Without it Netlify would serve the build output as static files and every regenerating route would 404.

### Auth redirect URLs

Supabase → **Authentication → URL Configuration**:

- **Site URL**: your production URL
- **Redirect URLs**: add `http://localhost:3000/**` and `https://your-site.netlify.app/**`

Email confirmations and password resets fail silently without this.

## 10. How content goes live

Course pages use incremental static regeneration with `revalidate: 60`, so an edit appears within about a minute — no redeploy. A URL that did not exist at build time is rendered on first request (`fallback: 'blocking'`) and cached afterwards.

Consequences worth knowing:

- **Drafts cannot leak.** Build-time reads use the publishable key with RLS on, so a cached page can only ever contain what an anonymous visitor may see.
- **Renaming a published slug orphans learner progress.** Progress rows are keyed by slug path (`hsc/physics/…`). Rename before you publish, or accept the loss.
- **Retired handles keep working.** Changing a mentor username or publisher slug records the old one and 301-redirects it, so shared links do not rot.

## 11. Optional: verify the schema locally

```bash
npm run pg:start      # throwaway Postgres 18, unix socket, no Docker, no sudo
npm run schema:apply  # → "schema: APPLIED CLEAN"
npm run test:schema   # → "173 passed, 0 failed"
npm run pg:stop
```

Worth running before you change any policy. **Never point it at your Supabase project.**

---

## Troubleshooting

**Catalogue is empty.** No published courses yet. A course needs `status = 'published'`, and its publisher needs `status = 'approved'`.

**"permission denied for function …"** The grant block at the end of Part 7 did not run. Re-apply `docs/schema.sql` in full — running it in fragments skips the revoke/grant step that undoes Supabase's default privileges.

**`/admin` says it is for app admins only.** Step 4 has not been done for the account you are signed in as. Verify with the `select` query in that step.

**Sign-in works locally but not in production.** Redirect URLs (step 9).

**Course edits do not show up.** Wait a minute for revalidation, and check the course and the individual lesson are both `published` — a draft lesson stays hidden inside a published course by design.

**Netlify build succeeds but pages 404.** `@netlify/plugin-nextjs` is missing or `netlify.toml` was overridden in the UI.

---

## Costs

The free tiers cover a small instance. Supabase pauses inactive free projects after a week — visit the dashboard to resume. Watch Supabase's database size and Netlify's build minutes as you grow.

## Getting help

Open an issue on the upstream repository. Include your Node version, whether it fails locally or deployed, and the exact error. Never paste your secret key or `.env.local`.

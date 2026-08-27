# Contributing to Feyn

Thanks for wanting to help. This document covers local setup, the conventions the codebase follows, and what a reviewable pull request looks like.

## Local development

```bash
git clone https://github.com/hello2himel/feyn.git
cd feyn
npm install
cp .env.example .env.local   # fill in your Supabase keys
npm run dev
```

You need a Supabase project of your own — see [docs/self-hosting.md](docs/self-hosting.md). Without one the app still builds and runs; the catalogue is simply empty.

Node 20 or newer. The repository is developed against Node 24.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Next dev server on :3000 |
| `npm run build` | Production build. Must pass before any commit. |
| `npm run lint` | `next lint` |
| `npm run pg:start` | Start a throwaway Postgres 18 cluster (no Docker, no sudo) |
| `npm run schema:apply` | Apply `tests/supabase-shim.sql` + `docs/schema.sql` to it |
| `npm run test:schema` | Run the 173-assertion RLS/RPC suite |
| `npm run pg:stop` | Stop the cluster |
| `npm run pg:destroy` | Delete the cluster's data directory |

`npm run pg:start` downloads a prebuilt Postgres via `embedded-postgres` on first use, listens on a unix socket in `/tmp`, and needs no system Postgres.

**Never point the test harness at a real Supabase project.** `docs/schema.sql` begins by dropping every Feyn table.

## Proposing a schema change

`docs/schema.sql` is the single source of truth. There are no incremental migration files: the file is idempotent and re-applying it rebuilds the schema from scratch.

1. Edit `docs/schema.sql`.
2. Add assertions to `tests/schema.test.js` that would fail without your change. Behaviour that is not asserted will be broken by someone later.
3. Run `npm run schema:apply` then `npm run test:schema`. Both must pass.
4. Update `docs/permissions.md` if you touched a policy, and `ARCHITECTURE.md` if you changed the model.
5. Mention in the PR that self-hosters need to re-run the schema.

Two rules that exist because breaking them cost real debugging time:

- **A policy on table X must not call a function that selects from table X.** `supabase-js` appends `RETURNING` to every insert, Postgres re-checks the SELECT policy against the new row, and a `stable` function's snapshot predates the statement — so the row it just inserted is invisible and the insert is rejected. Use the `*_row` helper forms that take columns as arguments.
- **Every new function needs an explicit grant in the block at the end of Part 7.** Postgres grants EXECUTE to `PUBLIC` by default and Supabase adds its own default grant on top; both must be revoked first. Note that `anon` genuinely needs EXECUTE on any helper used inside a policy predicate on a publicly-readable table, because policy predicates evaluate as the querying role.

## Conventions

**Permissions.** Never store a flat role on a user. Compute per request as `isAppAdmin OR membership.role for that publisher_id`, through `lib/permissions.js`. The UI decides what to *render*; the database decides what is *allowed*.

**Content reads.** `data/courseHelpers.js` is the only module that queries content tables for public pages. Keep the exported function names and returned shapes stable — pages, `lib/userStore.js` and the question engine all read the flat field names, and the schema→UI mapping lives in that one file.

**Server clients.** `lib/supabaseServer.js` exposes three: anon (RLS on, for `getStaticProps`), token-scoped (for API routes acting as the caller), and service-role (RLS bypassed). Default to the least privileged one that works. The service-role key must never be imported into anything reachable from the browser.

**Mutations.** State-changing operations go through the Part 7 RPCs, called via `/api/rpc/[fn]` (`lib/api.js#callRpc`). That keeps `join_policy`, last-admin protection and handle cooldowns enforced in one place. Direct table writes are fine for plain columns an RLS policy already governs — course content, `join_policy`.

**Comments.** Explain *why*, not *what*. Several files carry a header comment documenting a bug that a previous approach caused; if you change that code, read the header first. `lib/supabase.js` documents three failed fixes and should be treated carefully.

**Accessibility.** Every input needs a label (visible or `.sr-only`), every icon-only button needs `aria-label`, and status messages use `role="status"` with `aria-live="polite"`.

**Style.** Two-space indent, no semicolons, single quotes, functional React with hooks. Match the file you are editing rather than introducing a new style.

## Pull request checklist

- [ ] `npm run build` passes
- [ ] `npm run test:schema` passes (always, not just for schema changes)
- [ ] `npm run lint` reports nothing new
- [ ] Docs updated in the same PR as the code they describe
- [ ] New user-facing strings are plain English and say what to do next
- [ ] No secrets, no `.env.local`, no `SUPABASE_SERVICE_ROLE_KEY` in client code
- [ ] Inputs labelled, icon-only buttons have accessible names
- [ ] PR description says what changed, what you tested, and what you did not

Keep PRs focused. A schema change plus a UI redesign in one PR is two PRs.

## Reporting bugs

Include: what you did, what happened, what you expected, and whether Supabase was configured. For permission bugs, say which role you were acting as and which publisher — "it says I can't edit" is unactionable without that.

## License

Contributions are licensed under [AGPL-3.0](LICENSE), the same as the project.

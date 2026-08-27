# RLS policy reference

Every table in Feyn has row-level security enabled and no table is reachable without a policy. This document lists all 53 policies in plain English alongside the SQL, table by table. The authoritative source is [`schema.sql`](schema.sql); if the two disagree, the SQL wins and this file is a bug.

## How to read this

Three roles matter:

- **`anon`** — an unauthenticated visitor. `auth.uid()` is null.
- **`authenticated`** — a signed-in user. `auth.uid()` is their id.
- **`service_role`** — the secret key. Bypasses RLS entirely, but *not* the guard triggers in §Guards.

Policies are built from four helper functions rather than inline logic:

| Helper | Answers |
|---|---|
| `is_app_admin(uid)` | Is this user a global admin? |
| `has_publisher_role(pub_id, min_role)` | Do they hold at least this role in that publisher? Ranks `admin 3 > editor 2 > mentor 1`. App admins pass with no membership row. |
| `is_subject_visible(subj_id)` / `is_subject_visible_row(...)` | May the caller see this course? |
| `can_edit_subject(subj_id)` / `can_edit_in_publisher(...)` | May the caller edit this course? |

---

## Two rules that shape everything

### A policy on table X must not call a function that selects from table X

`supabase-js` appends `RETURNING` to every insert. Postgres then re-checks the SELECT policy against the row being returned. A `stable` function's snapshot predates the statement, so a lookup of the brand-new row finds nothing and the insert is rejected — with a message that blames the insert, not the SELECT policy.

That is why the visibility helpers come in two forms:

| Row form — used by policies *on* that table | Id form — used by child tables and app code |
|---|---|
| `is_publisher_visible_row(pub_id, status, registered_by)` | `is_publisher_visible(pub_id)` |
| `is_subject_visible_row(subj_id, publisher_id, status)` | `is_subject_visible(subj_id)` |
| `can_edit_in_publisher(pub_id, subj_id)` | `can_edit_subject(subj_id)` |

The row forms take the columns as arguments, so the predicate evaluates against the NEW tuple directly. The id forms are safe on child tables because those walk up to a parent that already exists.

### `anon` needs EXECUTE on the policy helpers

Policy predicates are evaluated **as the querying role**. So `anon` must be able to execute `is_app_admin`, `has_publisher_role`, `can_edit_subject` and the `*_row` forms, or anonymous SELECTs fail with `permission denied for function`. Revoking those to look tighter breaks the public site.

They are safe to expose: each returns a boolean about `auth.uid()` itself, and for `anon` that is null, so they all return false.

Only these are public for their own sake: `validate_handle`, `normalize_handle`, `is_reserved_handle`, `is_handle_available`, `is_username_taken`, `get_certificate_public`, `resolve_mentor_username`, `resolve_publisher_slug`. Everything state-changing is `authenticated`-only.

---

## Tenancy tables

### `app_admins`

Membership in this table *is* global admin. It has exactly one policy, and deliberately no INSERT, UPDATE or DELETE policy at all — so the bootstrap SQL statement cannot be replayed from the app.

**Only app admins can see who the admins are.**

```sql
create policy app_admins_select_admin on public.app_admins
  for select using (public.is_app_admin());
```

The first admin is created by raw SQL in the Supabase SQL editor (see [self-hosting.md](self-hosting.md) step 4). After that, `grant_app_admin()` handles it — and requires already being an admin.

### `mentors`

**Approved mentors are public. You can always see your own row, even while pending, and app admins see everything.**

```sql
create policy mentors_select_public on public.mentors
  for select using (
    status = 'approved'
    or user_id = auth.uid()
    or public.is_app_admin()
  );
```

**You may create exactly one mentor row, for yourself, in `pending` status.**

```sql
create policy mentors_insert_self on public.mentors
  for insert with check (
    user_id = auth.uid()
    and status = 'pending'
    and approved_by is null
  );
```

In practice `apply_as_mentor()` is used instead, which also validates the handle. The `unique (user_id)` constraint is what limits it to one row per person.

**You may edit your own profile; app admins may edit anyone's.** Privileged columns are protected separately — see §Guards.

```sql
create policy mentors_update_self on public.mentors
  for update using (user_id = auth.uid() or public.is_app_admin())
  with check  (user_id = auth.uid() or public.is_app_admin());
```

**Only app admins may delete a mentor.**

```sql
create policy mentors_delete_admin on public.mentors
  for delete using (public.is_app_admin());
```

### `publishers`

**Approved publishers are public. A registrant sees their own pending registration; members see their publisher; app admins see everything.**

```sql
create policy publishers_select_visible on public.publishers
  for select using (public.is_publisher_visible_row(id, status, registered_by));
```

**You may register a platform, as yourself, pending, unapproved.**

```sql
create policy publishers_insert_registration on public.publishers
  for insert with check (
    auth.uid() is not null
    and registered_by = auth.uid()
    and type = 'platform'
    and status = 'pending'
    and owner_mentor_id is null
    and approved_by is null
  );
```

`type = 'solo'` is rejected here on purpose: solo publishers are only ever created by `review_mentor_application()`, which is `security definer` and bypasses this policy.

**Publisher admins may edit their publisher.** Broad by design; the guard trigger restores `status`, `slug`, `approved_by` and the change counters.

```sql
create policy publishers_update_admin on public.publishers
  for update using (public.has_publisher_role(id, 'admin'))
  with check  (public.has_publisher_role(id, 'admin'));
```

**Only app admins may delete a publisher.**

```sql
create policy publishers_delete_admin on public.publishers
  for delete using (public.is_app_admin());
```

### `publisher_memberships`

**You see your own memberships; publisher admins see their publisher's; approved rows in a public publisher are visible to everyone (this powers the member list on `/p/[slug]`).**

```sql
create policy memberships_select on public.publisher_memberships
  for select using (
    user_id = auth.uid()
    or public.has_publisher_role(publisher_id, 'admin')
    or (status = 'approved' and public.is_publisher_visible(publisher_id))
  );
```

**There are no client-facing write policies.** Not an omission: every transition goes through a Part 7 RPC, so `join_policy` enforcement and last-admin protection live in exactly one place.

| Transition | RPC |
|---|---|
| mentor asks to join | `request_publisher_join()` — branches on `join_policy` |
| admin invites | `invite_publisher_member()` — always lands `pending` |
| mentor answers an invite | `respond_to_invitation()` — invitee only |
| admin answers a request | `review_join_request()` — cannot re-decide |
| change a role | `set_membership_role()` — cannot demote the last admin |
| member leaves | `leave_publisher()` — cannot leave as last admin or from your own solo |
| admin removes a member | `remove_publisher_member()` — cannot remove the last admin |

A direct INSERT, UPDATE or DELETE from the client fails or affects zero rows. Note that **RLS refuses UPDATE and DELETE silently**: with no matching policy the statement succeeds and affects nothing rather than raising. Client code must check the affected-row count, not just the absence of an error.

### `mentor_username_history`, `publisher_slug_history`

**Public.** They exist so retired handles can 301-redirect to the current one, which requires anonymous read access.

```sql
create policy mentor_username_history_select on public.mentor_username_history
  for select using (true);

create policy publisher_slug_history_select on public.publisher_slug_history
  for select using (true);
```

Rows are written only by `change_mentor_username()` / `change_publisher_slug()`. Retired handles count as taken, so an old link never repoints at a new owner.

---

## Content tables

### `programs`

Shared taxonomy ("HSC", "SSC", "Interests") owned by nobody.

**Everyone can read; only app admins can write.**

```sql
create policy programs_select_all on public.programs
  for select using (true);

create policy programs_write_admin on public.programs
  for all using (public.is_app_admin())
  with check  (public.is_app_admin());
```

### `subjects` (courses)

**Published courses under an approved publisher are public. Members of the owning publisher also see drafts.**

```sql
create policy subjects_select_visible on public.subjects
  for select using (public.is_subject_visible_row(id, publisher_id, status));
```

**Creating a course needs `editor` in the owning publisher, and the publisher must be approved.**

```sql
create policy subjects_insert on public.subjects
  for insert with check (
    public.has_publisher_role(publisher_id, 'editor')
    and exists (
      select 1 from public.publishers p
      where p.id = publisher_id and p.status = 'approved'
    )
  );
```

**Editing follows the permission matrix:** admin and editor may edit any course under the publisher; `mentor` only courses they are credited on.

```sql
create policy subjects_update on public.subjects
  for update using (public.can_edit_in_publisher(publisher_id, id))
  with check  (public.can_edit_in_publisher(publisher_id, id));
```

**Deleting a whole course is an admin act, not an editor's.**

```sql
create policy subjects_delete on public.subjects
  for delete using (public.has_publisher_role(publisher_id, 'admin'));
```

### `subject_mentors` (credits)

**Visible wherever the course is visible.**

```sql
create policy subject_mentors_select on public.subject_mentors
  for select using (public.is_subject_visible(subject_id));
```

**Only a publisher admin may assign credit, and only to a mentor with an approved membership in that publisher.**

```sql
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
    and exists (
      select 1
      from public.subjects s
      join public.publisher_memberships pm on pm.publisher_id = s.publisher_id
      where s.id = subject_id
        and pm.mentor_id = subject_mentors.mentor_id
        and pm.status = 'approved'
    )
  );
```

Both halves matter. Credit is a **permission grant**, not a label: it is what lets a `mentor`-role member edit that course. An editor must not be able to hand out edit rights, and crediting someone outside the publisher would silently grant write access to a stranger.

### `topics`, `skills`, `lessons`, `questions`

All four inherit visibility and editability from their subject by walking up the tree. Deeper tables mean longer joins — the cost of a normalized hierarchy, kept cheap by indexes on each foreign key.

**Topics** — visible with the subject, editable with the subject:

```sql
create policy topics_select on public.topics
  for select using (public.is_subject_visible(subject_id));

create policy topics_write on public.topics
  for all using (public.can_edit_subject(subject_id))
  with check  (public.can_edit_subject(subject_id));
```

**Skills** — same, one join up:

```sql
create policy skills_select on public.skills
  for select using (
    exists (select 1 from public.topics t
            where t.id = topic_id and public.is_subject_visible(t.subject_id))
  );
```

`skills_write` mirrors it with `can_edit_subject`.

**Lessons** — a draft lesson stays hidden even inside a published course, so half-written material never appears mid-course. Editors still see it:

```sql
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
```

**Questions** — visible when their lesson is visible, editable when the course is:

```sql
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
```

---

## Learner data

Seven tables — `profiles`, `enrollments`, `lesson_progress`, `lesson_attempts`, `watch_positions`, `certificates`, `user_preferences` — follow one pattern: **owner-only.**

```sql
create policy enrollments_select on public.enrollments
  for select using (auth.uid() = user_id);
create policy enrollments_insert on public.enrollments
  for insert with check (auth.uid() = user_id);
create policy enrollments_update on public.enrollments
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy enrollments_delete on public.enrollments
  for delete using (auth.uid() = user_id);
```

Every policy states both `using` and `with check` explicitly, so an UPDATE can never move a row to a different `user_id`.

App admins are deliberately excluded from the progress tables. Being able to approve mentors is not a reason to read someone's study history. The one exception is `profiles`, where `profiles_select_own` also allows `is_app_admin()` — an admin needs to resolve an account to a person to answer support requests.

Three deviations:

- **`lesson_attempts` has no UPDATE policy.** An attempt is a historical fact; correcting one is not a thing.
- **`certificates` has no DELETE policy.** An issued certificate is not retractable by its holder. Public verification goes through `get_certificate_public(cert_id)`, a `security definer` function that returns only the display fields — never `user_id`.
- **`profiles` has no DELETE policy.** Account deletion cascades from `auth.users`.

---

## Guards

RLS answers "may this caller touch this row". It cannot cheaply answer "may this caller touch this **column**", because comparing NEW against the stored row from inside a policy on the same table recurses through that policy and errors at runtime.

Two `BEFORE UPDATE` triggers close that gap by silently restoring privilege-bearing columns:

| Trigger | Restores |
|---|---|
| `guard_mentor_columns()` | `status`, `approved_by`, `approved_at`, `review_note`, `username`, `username_updated_at`, `username_change_count` |
| `guard_publisher_columns()` | `status`, `type`, `owner_mentor_id`, `registered_by`, `approved_by`, `approved_at`, `review_note`, `slug`, `slug_updated_at`, `slug_change_count` |

This is what makes self-approval impossible: the broad `mentors_update_self` policy lets you update your row, and the trigger puts `status` back. Like a refused UPDATE, the statement **succeeds** — it just does not change what you hoped.

Both delegate to `is_trusted_writer()`, which trusts exactly two signals:

```sql
create or replace function public.is_trusted_writer()
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_app_admin() or public.is_privileged_context()
$$;
```

`is_privileged_context()` reads a transaction-local flag that the Part 7 RPCs set:

```sql
select set_config('feyn.privileged', 'on', true);
```

An earlier version also accepted `current_user in ('postgres','service_role')`. That disabled the guards for everyone: the trigger functions are `security definer`, so inside them `current_user` is always the table owner and the check was unconditionally true.

**The service role bypasses RLS but not these triggers.** Server-side code that must write a guarded column directly has to opt in per transaction with the `set_config` call above, or go through an RPC.

---

## Verifying

```bash
npm run pg:start && npm run schema:apply && npm run test:schema
```

`tests/schema.test.js` asserts 173 behaviours against a real Postgres, including every refusal described here. The tests need a real database because they assert on RLS evaluation, `security definer` semantics and trigger side effects — none of which can be mocked.

**Never point the harness at a real Supabase project.** `docs/schema.sql` begins by dropping every Feyn table.

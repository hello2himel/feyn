// Feyn schema behaviour tests — runs against the local cluster.
// Each `as(user)` block opens a transaction, sets the JWT claims the
// way GoTrue would, switches to the `authenticated` role so RLS
// actually applies, runs the body, then rolls back or commits.
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const REPO = path.resolve(__dirname, '..');
const CONN = require('./pg-conn');
let pass = 0, fail = 0;
const failures = [];

function ok(name) { pass++; console.log('  ok   ' + name); }
function bad(name, detail) { fail++; failures.push(name + ' :: ' + detail); console.log('  FAIL ' + name + '\n         ' + detail); }

async function main() {
  const c = new Client(CONN);
  await c.connect();

  // ---- fresh apply ----
  await c.query(fs.readFileSync(path.join(__dirname, 'supabase-shim.sql'), 'utf8'));
  await c.query(fs.readFileSync(path.join(REPO, 'docs/schema.sql'), 'utf8'));

  // ---- users ----
  const emails = ['admin@feyn.test', 'alice@feyn.test', 'bob@feyn.test',
                  'carol@feyn.test', 'dave@feyn.test', 'outsider@feyn.test'];
  await c.query('delete from auth.users');
  const U = {};
  for (const e of emails) {
    const r = await c.query('insert into auth.users (email) values ($1) returning id', [e]);
    U[e.split('@')[0]] = r.rows[0].id;
  }

  // Run `sql` as `uid` under the authenticated role with RLS enforced.
  async function asUser(uid, sql, params = []) {
    await c.query('begin');
    try {
      if (uid) {
        await c.query("select set_config('request.jwt.claims', $1, true)",
          [JSON.stringify({ sub: uid, role: 'authenticated' })]);
      } else {
        await c.query("select set_config('request.jwt.claims', $1, true)",
          [JSON.stringify({ role: 'anon' })]);
      }
      await c.query('set local role ' + (uid ? 'authenticated' : 'anon'));
      const r = await c.query(sql, params);
      await c.query('reset role');
      await c.query('commit');
      return r;
    } catch (e) {
      await c.query('rollback');
      throw e;
    }
  }

  // Assert a call succeeds.
  async function allow(name, uid, sql, params = []) {
    try { const r = await asUser(uid, sql, params); ok(name); return r; }
    catch (e) { bad(name, 'unexpected error: ' + e.message); return null; }
  }
  // Assert a call is refused (exception raised).
  async function deny(name, uid, sql, params = [], expect = null) {
    try {
      await asUser(uid, sql, params);
      bad(name, 'expected refusal, but it succeeded');
    } catch (e) {
      if (expect && !e.message.toLowerCase().includes(expect.toLowerCase())) {
        bad(name, `refused with wrong reason: ${e.message}`);
      } else ok(name + '  [' + e.message.slice(0, 60) + ']');
    }
  }
  // Assert an RLS *silent filter*: the statement is legal but must
  // touch zero rows. This is how Postgres refuses an UPDATE/DELETE
  // with no matching policy — it does not raise.
  async function noRows(name, uid, sql, params = []) {
    try {
      const r = await asUser(uid, sql, params);
      if (r.rowCount === 0) ok(name + '  [0 rows]');
      else bad(name, `affected ${r.rowCount} row(s), expected 0`);
    } catch (e) { ok(name + '  [' + e.message.slice(0, 60) + ']'); }
  }

  // Assert a silent RLS outcome (row count / value).
  async function expectVal(name, uid, sql, params, want) {
    try {
      const r = await asUser(uid, sql, params);
      const got = r.rows.length ? Object.values(r.rows[0])[0] : null;
      if (String(got) === String(want)) ok(name + ' = ' + got);
      else bad(name, `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
    } catch (e) { bad(name, 'error: ' + e.message); }
  }

  console.log('\n== bootstrap: first app admin ==');
  // The first admin is inserted by raw SQL, the way a self-hoster does
  // it in the Supabase SQL editor. There is deliberately no in-app path.
  await deny('no in-app path to claim a fresh site', U.alice,
    "select public.grant_app_admin('alice@feyn.test')", [], 'SQL editor');
  await expectVal('no admins exist yet', null,
    'select count(*) from public.app_admins', [], 0);
  await c.query('insert into public.app_admins (user_id) values ($1)', [U.admin]);
  await expectVal('admin is app admin', U.admin,
    'select public.is_app_admin()', [], true);
  await allow('an existing admin can grant another', U.admin,
    "select public.grant_app_admin('dave@feyn.test')");
  await expectVal('dave is now an admin', U.dave,
    'select public.is_app_admin()', [], true);
  // Keep the rest of the suite's assumptions intact: dave must be a
  // plain user for the learner-isolation and non-mentor checks.
  await c.query('delete from public.app_admins where user_id = $1', [U.dave]);
  await expectVal('dave is a plain user again', U.dave,
    'select public.is_app_admin()', [], false);
  await deny('non-admin cannot grant admin', U.alice,
    "select public.grant_app_admin('alice@feyn.test')", [], 'App Admin');
  await expectVal('alice is not app admin', U.alice,
    'select public.is_app_admin()', [], false);
  await deny('nobody can insert into app_admins from the app', U.alice,
    'insert into public.app_admins (user_id) values ($1)', [U.alice]);
  await deny('anon cannot call grant_app_admin at all', null,
    "select public.grant_app_admin('alice@feyn.test')", [], 'permission denied');

  console.log('\n== handles ==');
  await expectVal('reserved handle rejected', null,
    "select public.validate_handle('admin')", [], 'This handle is reserved.');
  await expectVal('too short rejected', null,
    "select public.validate_handle('ab')", [], 'Must be at least 3 characters.');
  // Mixed case is normalized, not rejected: /m/Alice and /m/alice are
  // the same handle. Characters outside the set are what get refused.
  await expectVal('mixed case is normalized, not rejected', null,
    "select public.validate_handle('Alice')", [], null);
  await expectVal('illegal characters rejected', null,
    "select public.validate_handle('alice.x')", [],
    'Only lowercase letters, numbers, hyphens and underscores.');
  await expectVal('double hyphen rejected', null,
    "select public.validate_handle('a--b')", [], 'Cannot contain consecutive hyphens.');
  await expectVal('trailing underscore rejected', null,
    "select public.validate_handle('alice_')", [],
    'Cannot start or end with a hyphen or underscore.');
  await expectVal('valid handle passes', null,
    "select public.validate_handle('alice-x_1')", [], null);
  await expectVal('anon can probe availability', null,
    "select public.is_handle_available('alice','mentor')", [], true);
  await expectVal('bad namespace is not available', null,
    "select public.is_handle_available('alice','nonsense')", [], false);

  console.log('\n== mentor application + approval ==');
  const alice = (await allow('alice applies as mentor', U.alice,
    "select public.apply_as_mentor('Alice Rahman','alice','Physics teacher','MSc')"))
    .rows[0].apply_as_mentor;
  await expectVal('username now taken', null,
    "select public.is_handle_available('alice','mentor')", [], false);
  await deny('bob cannot take alice username', U.bob,
    "select public.apply_as_mentor('Bob','ALICE')", [], 'taken');
  await deny('reserved username refused at application', U.bob,
    "select public.apply_as_mentor('Bob','settings')", [], 'reserved');

  await expectVal('pending mentor invisible to outsiders', U.outsider,
    'select count(*) from public.mentors', [], 0);
  await expectVal('pending mentor visible to self', U.alice,
    'select count(*) from public.mentors', [], 1);
  await expectVal('pending mentor visible to app admin', U.admin,
    'select count(*) from public.mentors', [], 1);

  // The guard trigger silently restores privileged columns rather than
  // raising, so the UPDATE reports success. What matters is the stored
  // value afterwards.
  await asUser(U.alice, "update public.mentors set status='approved', bio='hacked' where id=$1", [alice])
    .then(() => {}).catch(() => {});
  await expectVal('guard trigger kept status pending', U.admin,
    'select status from public.mentors where id=$1', [alice], 'pending');
  await expectVal('guard trigger still allowed bio edit', U.admin,
    'select bio from public.mentors where id=$1', [alice], 'hacked');
  await asUser(U.alice, "update public.mentors set username='stolen' where id=$1", [alice])
    .then(() => {}).catch(() => {});
  await expectVal('guard trigger froze username', U.admin,
    'select username from public.mentors where id=$1', [alice], 'alice');

  await deny('non-admin cannot review applications', U.bob,
    'select public.review_mentor_application($1, true)', [alice], 'App Admin');
  await allow('admin approves alice', U.admin,
    'select public.review_mentor_application($1, true)', [alice]);
  await expectVal('alice is approved', null,
    'select status from public.mentors where id=$1', [alice], 'approved');
  await expectVal('approved mentor is publicly visible', null,
    'select count(*) from public.mentors', [], 1);

  console.log('\n== solo publisher auto-creation ==');
  await expectVal('solo publisher created', null,
    "select slug from public.publishers where type='solo' and owner_mentor_id=$1", [alice], 'alice');
  await expectVal('solo publisher is approved', null,
    "select status from public.publishers where owner_mentor_id=$1", [alice], 'approved');
  await expectVal('solo publisher is invite_only', null,
    "select join_policy from public.publishers where owner_mentor_id=$1", [alice], 'invite_only');
  await expectVal('alice is admin of her solo publisher', U.alice,
    "select role from public.publisher_memberships where user_id=$1", [U.alice], 'admin');
  await allow('re-approval is idempotent', U.admin,
    'select public.review_mentor_application($1, true)', [alice]);
  await expectVal('still exactly one solo publisher', null,
    "select count(*) from public.publishers where type='solo'", [], 1);

  const soloId = (await c.query(
    "select id from public.publishers where type='solo' and owner_mentor_id=$1", [alice])).rows[0].id;

  console.log('\n== slug collision across namespaces ==');
  // bob registers a platform named 'bob', then applies as mentor 'bob':
  // the solo publisher must get a suffixed slug, not collide.
  const bobPub = (await allow('bob registers platform slug=bob', U.bob,
    "select public.register_publisher('Bob Academy','bob','desc','#123456')"))
    .rows[0].register_publisher;
  const bobMentor = (await allow('bob applies as mentor username=bob', U.bob,
    "select public.apply_as_mentor('Bob Karim','bob')")).rows[0].apply_as_mentor;
  await allow('admin approves bob mentor', U.admin,
    'select public.review_mentor_application($1, true)', [bobMentor]);
  await expectVal('bob solo publisher got suffixed slug', null,
    "select slug from public.publishers where type='solo' and owner_mentor_id=$1", [bobMentor], 'bob-1');

  console.log('\n== platform registration + approval ==');
  await expectVal('pending platform hidden from outsiders', U.outsider,
    'select count(*) from public.publishers where id=$1', [bobPub], 0);
  await expectVal('pending platform visible to registrant', U.bob,
    'select count(*) from public.publishers where id=$1', [bobPub], 1);
  await deny('cannot self-insert an approved publisher', U.carol,
    `insert into public.publishers (type,name,slug,status,registered_by)
     values ('platform','Sneaky','sneaky','approved',$1)`, [U.carol]);
  await deny('cannot self-insert a solo publisher', U.carol,
    `insert into public.publishers (type,name,slug,status,registered_by,owner_mentor_id)
     values ('solo','Sneaky','sneaky2','pending',$1,$2)`, [U.carol, alice]);
  await asUser(U.bob, "update public.publishers set status='approved' where id=$1", [bobPub])
    .then(() => {}).catch(() => {});
  await expectVal('guard trigger blocked self-approval of platform', U.admin,
    'select status from public.publishers where id=$1', [bobPub], 'pending');
  await deny('non-admin cannot review a registration', U.alice,
    'select public.review_publisher_registration($1, true)', [bobPub], 'App Admin');
  await allow('admin approves bob platform', U.admin,
    'select public.review_publisher_registration($1, true)', [bobPub]);
  await expectVal('registrant became platform admin', U.bob,
    `select role from public.publisher_memberships
      where publisher_id=$1 and user_id=$2`, [bobPub, U.bob], 'admin');
  await expectVal('platform now public', null,
    'select count(*) from public.publishers where id=$1', [bobPub], 1);
  await deny('solo publishers are not reviewable', U.admin,
    'select public.review_publisher_registration($1, true)', [soloId], 'not reviewed');

  console.log('\n== join policies ==');
  // carol becomes an approved mentor for join tests.
  const carol = (await allow('carol applies', U.carol,
    "select public.apply_as_mentor('Carol Das','carol')")).rows[0].apply_as_mentor;
  await allow('admin approves carol', U.admin,
    'select public.review_mentor_application($1, true)', [carol]);
  // dave stays a plain user (no mentor row) on purpose.

  await deny('non-mentor cannot request to join', U.dave,
    'select public.request_publisher_join($1)', [bobPub], 'approved mentors');
  await deny('nobody can join a solo publisher', U.carol,
    'select public.request_publisher_join($1)', [soloId], 'Solo publishers');

  // default policy is approval_required
  await expectVal('carol join request is pending', U.carol,
    'select public.request_publisher_join($1)', [bobPub], 'pending');
  const carolMem = (await c.query(
    'select id from public.publisher_memberships where publisher_id=$1 and user_id=$2',
    [bobPub, U.carol])).rows[0].id;
  await expectVal('pending member cannot edit publisher content yet', U.carol,
    'select public.has_publisher_role($1, $2)', [bobPub, 'mentor'], false);
  await deny('non-admin cannot review the join request', U.carol,
    'select public.review_join_request($1, true)', [carolMem], 'admin only');
  await allow('bob approves carol', U.bob,
    'select public.review_join_request($1, true)', [carolMem]);
  await expectVal('carol now has mentor role', U.carol,
    'select public.has_publisher_role($1, $2)', [bobPub, 'mentor'], true);
  await expectVal('carol is not an editor', U.carol,
    'select public.has_publisher_role($1, $2)', [bobPub, 'editor'], false);
  await deny('cannot re-review a decided request', U.bob,
    'select public.review_join_request($1, true)', [carolMem], 'No pending request');
  await deny('carol cannot join twice', U.carol,
    'select public.request_publisher_join($1)', [bobPub], 'already a member');

  // open policy → instant join
  await allow('bob switches platform to open', U.bob,
    "update public.publishers set join_policy='open' where id=$1", [bobPub]);
  const openMentor = (await allow('alice can request join under open', U.alice,
    'select public.request_publisher_join($1)', [bobPub]));
  await expectVal('open policy joins instantly', U.alice,
    `select status from public.publisher_memberships
      where publisher_id=$1 and user_id=$2`, [bobPub, U.alice], 'approved');
  await allow('alice leaves', U.alice, 'select public.leave_publisher($1)', [bobPub]);

  // invite_only → refuse self-serve
  await allow('bob switches platform to invite_only', U.bob,
    "update public.publishers set join_policy='invite_only' where id=$1", [bobPub]);
  await deny('invite_only refuses self-serve join', U.alice,
    'select public.request_publisher_join($1)', [bobPub], 'invite-only');
  await expectVal('editor cannot change join_policy', U.carol,
    "select public.has_publisher_role($1,'admin')", [bobPub], false);

  console.log('\n== invitations ==');
  const inv = (await allow('bob invites alice as editor', U.bob,
    "select public.invite_publisher_member($1,'alice@feyn.test','editor')", [bobPub]))
    .rows[0].invite_publisher_member;
  await expectVal('invite lands pending', U.alice,
    'select status from public.publisher_memberships where id=$1', [inv], 'pending');
  await expectVal('invite is marked platform-initiated', U.alice,
    'select requested_by from public.publisher_memberships where id=$1', [inv], 'platform');
  await deny('unknown email cannot be invited', U.bob,
    "select public.invite_publisher_member($1,'nobody@feyn.test','mentor')", [bobPub], 'No Feyn account');
  await deny('non-admin cannot invite', U.carol,
    "select public.invite_publisher_member($1,'dave@feyn.test','mentor')", [bobPub], 'admin only');
  await deny('bogus role rejected', U.bob,
    "select public.invite_publisher_member($1,'dave@feyn.test','owner')", [bobPub], 'Unknown role');
  await deny('carol cannot answer alice invitation', U.carol,
    'select public.respond_to_invitation($1, true)', [inv], 'Not your invitation');
  await allow('alice accepts', U.alice,
    'select public.respond_to_invitation($1, true)', [inv]);
  await expectVal('alice is editor of bob platform', U.alice,
    "select public.has_publisher_role($1,'editor')", [bobPub], true);
  await expectVal('alice is not admin there', U.alice,
    "select public.has_publisher_role($1,'admin')", [bobPub], false);
  await expectVal('alice keeps admin of her own solo publisher', U.alice,
    "select public.has_publisher_role($1,'admin')", [soloId], true);

  console.log('\n== membership writes are RPC-only ==');
  await deny('direct membership insert refused', U.dave,
    `insert into public.publisher_memberships
       (publisher_id,user_id,role,status,requested_by)
     values ($1,$2,'admin','approved','mentor')`, [bobPub, U.dave]);
  await noRows('direct role escalation refused', U.carol,
    `update public.publisher_memberships set role='admin' where id=$1`, [carolMem]);
  await expectVal('carol is still role=mentor', U.carol,
    'select role from public.publisher_memberships where id=$1', [carolMem], 'mentor');
  await noRows('direct membership delete refused', U.carol,
    'delete from public.publisher_memberships where id=$1', [carolMem]);
  await expectVal('carol membership survived', U.carol,
    'select count(*) from public.publisher_memberships where id=$1', [carolMem], 1);

  console.log('\n== last-admin protection ==');
  const bobMem = (await c.query(
    'select id from public.publisher_memberships where publisher_id=$1 and user_id=$2',
    [bobPub, U.bob])).rows[0].id;
  await deny('cannot demote the only admin', U.bob,
    "select public.set_membership_role($1,'editor')", [bobMem], 'at least one admin');
  await deny('cannot leave as the only admin', U.bob,
    'select public.leave_publisher($1)', [bobPub], 'Promote another admin');
  await allow('promote alice to admin', U.bob,
    "select public.set_membership_role($1,'admin')", [inv]);
  await allow('now bob can be demoted', U.bob,
    "select public.set_membership_role($1,'editor')", [bobMem]);
  await allow('restore bob to admin', U.alice,
    "select public.set_membership_role($1,'admin')", [bobMem]);
  await deny('cannot leave own solo publisher', U.alice,
    'select public.leave_publisher($1)', [soloId], 'own solo publisher');
  await deny('solo publisher members are not removable', U.alice,
    'select public.remove_publisher_member($1)',
    [(await c.query('select id from public.publisher_memberships where publisher_id=$1', [soloId])).rows[0].id],
    'Solo publishers');

  console.log('\n== content authoring + permission matrix ==');
  const prog = (await c.query("select id from public.programs where slug='hsc'")).rows[0].id;

  // Reset roles so each rung of the ladder is represented exactly once:
  // bob = admin, alice = editor, carol = mentor.
  await allow('demote alice back to editor', U.bob,
    "select public.set_membership_role($1,'editor')", [inv]);

  // A mentor who belongs to no publisher at all, for the
  // cross-publisher credit test below.
  const stranger = (await allow('outsider becomes a mentor', U.outsider,
    "select public.apply_as_mentor('Stranger','stranger')")).rows[0].apply_as_mentor;
  await allow('admin approves the stranger', U.admin,
    'select public.review_mentor_application($1, true)', [stranger]);

  await deny('mentor role cannot create a course', U.carol,
    `insert into public.subjects (program_id,publisher_id,name,slug)
     values ($1,$2,'Physics','physics')`, [prog, bobPub]);
  const subj = (await allow('admin creates a course', U.bob,
    `insert into public.subjects (program_id,publisher_id,name,slug,status)
     values ($1,$2,'Physics','physics','draft') returning id`, [prog, bobPub])).rows[0].id;
  await allow('editor can create a course too', U.alice,
    `insert into public.subjects (program_id,publisher_id,name,slug)
     values ($1,$2,'Chemistry','chemistry') returning id`, [prog, bobPub]);
  await deny('cannot create a course under a foreign publisher', U.carol,
    `insert into public.subjects (program_id,publisher_id,name,slug)
     values ($1,$2,'Biology','biology')`, [prog, soloId]);

  await expectVal('draft course hidden from public', null,
    'select count(*) from public.subjects where id=$1', [subj], 0);
  await expectVal('draft course visible to its publisher admin', U.bob,
    'select count(*) from public.subjects where id=$1', [subj], 1);
  await expectVal('mentor-role member cannot see uncredited draft', U.carol,
    'select count(*) from public.subjects where id=$1', [subj], 0);
  await expectVal('mentor-role member cannot edit uncredited course', U.carol,
    'select public.can_edit_subject($1)', [subj], false);

  await deny('editor cannot assign course credit', U.alice,
    'insert into public.subject_mentors (subject_id,mentor_id) values ($1,$2)', [subj, carol]);
  await allow('admin credits carol on the course', U.bob,
    'insert into public.subject_mentors (subject_id,mentor_id) values ($1,$2)', [subj, carol]);
  await expectVal('credited mentor can now edit', U.carol,
    'select public.can_edit_subject($1)', [subj], true);
  await expectVal('credited mentor sees the draft', U.carol,
    'select count(*) from public.subjects where id=$1', [subj], 1);
  await deny('cannot credit a non-member mentor', U.bob,
    'insert into public.subject_mentors (subject_id,mentor_id) values ($1,$2)', [subj, stranger]);

  await allow('carol renames her credited course', U.carol,
    "update public.subjects set description='by carol' where id=$1", [subj]);
  await noRows('mentor role cannot delete a course', U.carol,
    'delete from public.subjects where id=$1', [subj]);
  await noRows('outsider cannot touch the course', U.outsider,
    "update public.subjects set name='pwned' where id=$1", [subj]);
  await expectVal('outsider update changed nothing', U.bob,
    'select name from public.subjects where id=$1', [subj], 'Physics');

  console.log('\n== nested content inherits permissions ==');
  const topic = (await allow('carol creates a topic', U.carol,
    "insert into public.topics (subject_id,name,slug) values ($1,'Dynamics','dynamics') returning id",
    [subj])).rows[0].id;
  const skill = (await allow('carol creates a skill', U.carol,
    "insert into public.skills (topic_id,name,slug) values ($1,'Motion','motion') returning id",
    [topic])).rows[0].id;
  const lesson = (await allow('carol creates a lesson', U.carol,
    `insert into public.lessons (skill_id,title,slug,status)
     values ($1,'Velocity','velocity','published') returning id`, [skill])).rows[0].id;
  await allow('carol adds a question', U.carol,
    `insert into public.questions (lesson_id,kind,prompt,options,answer)
     values ($1,'mcq','What is v?','[{"id":"a","text":"d/t"}]','{"correct":"a"}')`, [lesson]);
  await deny('outsider cannot create a topic', U.outsider,
    "insert into public.topics (subject_id,name,slug) values ($1,'X','x')", [subj]);
  await expectVal('published lesson still hidden inside a draft course', null,
    'select count(*) from public.lessons where id=$1', [lesson], 0);
  await expectVal('question hidden with its draft course', null,
    'select count(*) from public.questions where lesson_id=$1', [lesson], 0);

  await allow('bob publishes the course', U.bob,
    "update public.subjects set status='published' where id=$1", [subj]);
  await expectVal('published course is public', null,
    'select count(*) from public.subjects where id=$1', [subj], 1);
  await expectVal('published lesson is public', null,
    'select count(*) from public.lessons where id=$1', [lesson], 1);
  await expectVal('topic is public', null,
    'select count(*) from public.topics where id=$1', [topic], 1);
  await expectVal('skill is public', null,
    'select count(*) from public.skills where id=$1', [skill], 1);
  await expectVal('question is public', null,
    'select count(*) from public.questions where lesson_id=$1', [lesson], 1);

  const draftLesson = (await allow('bob adds a draft lesson', U.bob,
    `insert into public.lessons (skill_id,title,slug,status)
     values ($1,'WIP','wip','draft') returning id`, [skill])).rows[0].id;
  await expectVal('draft lesson hidden inside a published course', null,
    'select count(*) from public.lessons where id=$1', [draftLesson], 0);
  await expectVal('draft lesson visible to editors', U.bob,
    'select count(*) from public.lessons where id=$1', [draftLesson], 1);

  console.log('\n== handle changes: cooldown + cap ==');
  await deny('non-mentor cannot change a username', U.dave,
    "select public.change_mentor_username('dave')", [], 'not a mentor');
  await allow('carol renames herself', U.carol,
    "select public.change_mentor_username('carol-das')", []);
  await expectVal('username changed', null,
    'select username from public.mentors where id=$1', [carol], 'carol-das');
  await expectVal('old handle recorded in history', null,
    "select count(*) from public.mentor_username_history where old_username='carol'", [], 1);
  await expectVal('retired handle counts as taken', null,
    "select public.is_handle_available('carol','mentor')", [], false);
  await expectVal('old handle resolves to the new one', null,
    "select public.resolve_mentor_username('carol')", [], 'carol-das');
  await expectVal('current handle resolves to itself', null,
    "select public.resolve_mentor_username('carol-das')", [], 'carol-das');
  await deny('cooldown blocks a second change', U.carol,
    "select public.change_mentor_username('carol2')", [], 'change your username again');
  await allow('no-op rename is free', U.carol,
    "select public.change_mentor_username('CAROL-DAS')", []);
  await expectVal('no-op did not burn a change', null,
    'select username_change_count from public.mentors where id=$1', [carol], 1);

  // Rewind the cooldown clock. guard_mentor_columns() protects
  // username_updated_at from every caller that is not an App Admin or
  // inside a Part 7 RPC — including the table owner — so the harness
  // has to opt in the same way server-side code would.
  async function rewindCooldown(mentorId) {
    await c.query('begin');
    await c.query("select set_config('feyn.privileged','on',true)");
    await c.query(
      `update public.mentors set username_updated_at = now() - interval '20 days' where id=$1`,
      [mentorId]);
    await c.query('commit');
  }

  // Proof the guard is not bypassable by the table owner alone.
  await c.query('update public.mentors set username_change_count = 0 where id=$1', [carol]);
  await expectVal('guard blocks the table owner outside a trusted context', null,
    'select username_change_count from public.mentors where id=$1', [carol], 1);

  // And not by the mentor themselves.
  await asUser(U.carol, 'update public.mentors set username_change_count = 0 where user_id = auth.uid()')
    .then(() => {}).catch(() => {});
  await expectVal('guard blocks a mentor rewinding their own counter', null,
    'select username_change_count from public.mentors where id=$1', [carol], 1);

  // Exhaust the cap by rewinding the cooldown each time. The DB is the
  // only enforcement point, so both limits have to be provably real.
  for (let i = 2; i <= 5; i++) {
    await rewindCooldown(carol);
    await asUser(U.carol, `select public.change_mentor_username('carol-v${i}')`);
  }
  await rewindCooldown(carol);
  await expectVal('cap reached', null,
    'select username_change_count from public.mentors where id=$1', [carol], 5);
  await deny('lifetime cap enforced', U.carol,
    "select public.change_mentor_username('carol-v6')", [], 'all 5 username changes');
  // The documented escape hatch: an App Admin edits the row directly.
  // change_mentor_username() acts on the *caller's* mentor row, so an
  // admin cannot use it on someone else's behalf.
  await deny('admin cannot rename others via the self-serve RPC', U.admin,
    "select public.change_mentor_username('carol-v6')", [], 'not a mentor');
  await allow('app admin overrides the cap directly', U.admin,
    "update public.mentors set username='carol-v6' where id=$1", [carol]);
  await expectVal('admin override landed', null,
    'select username from public.mentors where id=$1', [carol], 'carol-v6');

  console.log('\n== publisher slug changes ==');
  await deny('non-admin cannot change a slug', U.carol,
    "select public.change_publisher_slug($1,'carol-academy')", [bobPub], 'admin only');
  await allow('publisher admin changes the slug', U.bob,
    "select public.change_publisher_slug($1,'bob-academy')", [bobPub]);
  await expectVal('old slug resolves forward', null,
    "select public.resolve_publisher_slug('bob')", [], 'bob-academy');
  await deny('slug cooldown enforced', U.bob,
    "select public.change_publisher_slug($1,'bobx')", [bobPub], 'change this slug again');
  await deny('cannot take a reserved slug', U.admin,
    "select public.change_publisher_slug($1,'admin')", [bobPub], 'reserved');

  console.log('\n== learner data isolation ==');
  await allow('dave enrolls', U.dave,
    "insert into public.enrollments (user_id,subject_key) values ($1,'hsc/physics')", [U.dave]);
  await deny('cannot enroll on behalf of someone else', U.dave,
    "insert into public.enrollments (user_id,subject_key) values ($1,'hsc/physics')", [U.alice]);
  await expectVal('dave sees his enrollment', U.dave,
    'select count(*) from public.enrollments', [], 1);
  await expectVal('alice cannot see dave enrollment', U.alice,
    'select count(*) from public.enrollments', [], 0);
  await expectVal('even app admin cannot read enrollments', U.admin,
    'select count(*) from public.enrollments', [], 0);
  await allow('dave saves progress', U.dave,
    "insert into public.lesson_progress (user_id,lesson_key) values ($1,'a/b/c/d/e')", [U.dave]);
  await expectVal('progress is private', U.alice,
    'select count(*) from public.lesson_progress', [], 0);

  await allow('dave gets a certificate', U.dave,
    `insert into public.certificates (id,user_id,program_name,subject_name,user_name,publisher_name,mentor_names)
     values ('CERT-1',$1,'HSC','Physics','Dave','Bob Academy','Carol Das')`, [U.dave]);
  await expectVal('certificate row is private', U.alice,
    "select count(*) from public.certificates where id='CERT-1'", [], 0);
  await expectVal('public verification works for anon', null,
    "select subject_name from public.get_certificate_public('CERT-1')", [], 'Physics');
  await expectVal('verification exposes no user_id', null,
    `select count(*) from information_schema.columns
      where table_name='certificates' and column_name='user_id'`, [], 1);

  console.log('\n== app admin override reach ==');
  await expectVal('admin can edit any course', U.admin,
    'select public.can_edit_subject($1)', [subj], true);
  await expectVal('admin has role in any publisher', U.admin,
    "select public.has_publisher_role($1,'admin')", [soloId], true);
  await expectVal('admin holds no membership rows', null,
    'select count(*) from public.publisher_memberships where user_id=$1', [U.admin], 0);
  await allow('admin can delete a course', U.admin,
    'delete from public.subjects where id=$1', [subj]);

  console.log('\n== anon reach ==');
  await expectVal('anon sees programs', null, 'select count(*) from public.programs', [], 4);
  await expectVal('anon cannot read app_admins', null,
    'select count(*) from public.app_admins', [], 0);
  await deny('anon cannot apply as mentor', null,
    "select public.apply_as_mentor('X','xyz')", [], 'permission denied');
  // Every publisher created so far: bob's platform plus one solo
  // publisher each for alice, bob, carol and the stranger.
  await expectVal('anon sees approved publishers only', null,
    'select count(*) from public.publishers', [], 5);
  await expectVal('anon sees no pending publishers', null,
    "select count(*) from public.publishers where status <> 'approved'", [], 0);

  console.log(`\n${pass} passed, ${fail} failed`);
  if (failures.length) {
    console.log('\nFAILURES:');
    failures.forEach(f => console.log(' - ' + f));
  }
  await c.end();
  process.exit(fail ? 1 : 0);
}
main().catch(e => { console.error('HARNESS CRASH:', e.message); process.exit(3); });

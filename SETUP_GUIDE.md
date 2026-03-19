# Feyn v17 — Supabase OTP Setup Guide

This guide walks you through configuring Supabase so that sign-up and
sign-in use a 6-digit OTP code (the flow your codebase is built for),
and uploading the custom email template.

---

## Part 1 — Enable Email OTP in Supabase

### Step 1 — Go to your project's Auth settings

1. Open https://supabase.com/dashboard
2. Select your Feyn project
3. In the left sidebar, click **Authentication**
4. Click **Providers** in the sub-menu

### Step 2 — Configure the Email provider

1. Under **Email**, click to expand the settings
2. Make sure **Enable Email provider** is ON (toggle is blue)
3. Turn **Confirm email** ON
   - This is what requires users to verify before they can sign in
   - Without this, signUp returns a session immediately and skips OTP entirely
4. Turn **Enable email confirmations** ON (same toggle, just confirm it's enabled)
5. Leave **Secure email change** ON (default)
6. Click **Save**

### Step 3 — Switch confirmation method to OTP (not magic link)

By default Supabase sends a magic link (a clickable URL). You want a
6-digit code instead. Here's how to switch:

1. Still in **Authentication**, click **Email Templates** in the sub-menu
2. You'll see several template types. Select **Confirm signup**
3. At the top of the template editor, find **"Confirm signup via"**
   — it defaults to **"Link"**. Change it to **"OTP"**
   - If you don't see this toggle, look for a dropdown labelled
     **"Mailer type"** or **"Delivery method"** — set it to **OTP**
4. Do the same for **Magic Link** template if you see it — switch to OTP

> **Note:** On Supabase free tier this is fully supported. The OTP is a
> 6-digit numeric code, exactly what your `OtpInput` component expects.

### Step 4 — Set OTP expiry

1. In **Authentication → Settings** (top-level settings page)
2. Find **"OTP expiry"** or **"Email OTP expiry"**
3. Set it to `600` (seconds = 10 minutes)
   - This matches the "expires in 10 minutes" copy in your UI and email template
4. Save

---

## Part 2 — Upload the Email Template

### Step 1 — Open the Confirm Signup template editor

1. **Authentication → Email Templates → Confirm signup**
2. You should see an HTML editor with the current template

### Step 2 — Paste the template

1. Select all the existing content in the HTML editor and delete it
2. Open `supabase-otp-email-template.html` from this project
3. Copy the entire file contents
4. Paste into the Supabase HTML editor

### Step 3 — Set the Subject line

In the **Subject** field above the HTML editor, enter:

```
Your Feyn verification code
```

Or whatever you prefer — keep it clear so users don't think it's spam.

### Step 4 — Check the token variable

Supabase injects the OTP code via `{{ .Token }}`. The template already
has this in the right place inside `.otp-code`. Do not change it.

If you ever need to reference it elsewhere in the template, use `{{ .Token }}`
(double curly braces, capital T).

### Step 5 — Save and send a test

1. Click **Save** in the template editor
2. Click **Send test email** (if available) and check your inbox
3. Verify the code renders correctly — it should appear as a large
   6-digit number in the amber/gold colour

---

## Part 3 — Set up Netlify environment variables

Your app needs two environment variables to connect to Supabase. These
go in Netlify, not in any file (never commit them to git).

### Step 1 — Get your Supabase keys

1. In Supabase dashboard, click **Project Settings** (gear icon)
2. Click **API**
3. Copy:
   - **Project URL** → this is your `NEXT_PUBLIC_SUPABASE_URL`
   - **anon / public** key → this is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Do NOT use the `service_role` key anywhere in the frontend

### Step 2 — Add them to Netlify

1. Open https://app.netlify.com
2. Select your Feyn site
3. Go to **Site configuration → Environment variables**
4. Click **Add a variable** for each:

   | Key                           | Value                          |
   |-------------------------------|--------------------------------|
   | NEXT_PUBLIC_SUPABASE_URL      | https://xxxx.supabase.co       |
   | NEXT_PUBLIC_SUPABASE_ANON_KEY | eyJhbGciO...                   |

5. Click **Save**
6. Trigger a new deploy (or push a commit) — the env vars only take
   effect after a redeploy

---

## Part 4 — Supabase database — run the schema

If you haven't run the database schema yet, do it now:

1. In Supabase dashboard, click **SQL Editor**
2. Click **New query**
3. Open `supabase-schema.sql` from this project
4. Paste it into the query editor
5. Click **Run**

This creates the `profiles`, `enrollments`, `lesson_progress`, and
`certificates` tables with the correct RLS policies.

---

## Part 5 — Verify everything works end to end

### Test sign-up

1. Open your site
2. Click **Join free** or **Sign in**
3. Fill in name, email, password and click **Create account**
4. The modal should transition to the **"Check your email"** screen
   showing the OTP boxes
5. Check your email — you should receive the Feyn-branded OTP email
6. Enter the 6-digit code
7. The modal should advance to the grade picker (onboarding step 1)

### Test wrong code

- Enter a wrong code → should show "Incorrect code" error
- The resend button appears after submit fails

### Test resend

- Click **Resend code** → 30-second cooldown starts
- A new code arrives; the old one is now invalid

### Test sign-in with unconfirmed account

- Sign up but don't enter the code
- Try to sign in with the same email/password
- Should show the OTP screen again (not "wrong password")

### Test wrong password

- Enter a valid email but wrong password
- Should show "Wrong email or password" — no OTP email is sent
  (this was a bug in v16 — fixed in v17)

---

## Summary of what changed in v17 vs v16

| Area | v16 bug | v17 fix |
|------|---------|---------|
| Sign-up OTP screen | Never showed if OTP send "failed" — silently went to grade picker | Always shows when email confirmation is required |
| Sign-in wrong password | Sent unsolicited OTP email to any valid address | OTP only sent for "email not confirmed" error |
| Overlay click during onboarding | Could dismiss grade/courses/interests steps, skip setOnboarded() | Those steps are locked — only auth mode is dismissible |
| handleOtp useEffect | Stale closure — could auto-submit with wrong values | Wrapped in useCallback with correct deps |
| Resend error | Froze cooldown timer on failure | Cooldown only starts on success |
| settings.js theme | Tried to get theme/setTheme from useAuth (not in context) → crash | Removed — AppearanceTab manages its own theme state |
| settings.js upgrade | Checked res.needsVerify but userStore returned needsOtp → "check email" never showed | Unified to needsOtp throughout |
| setLastVisited | Stomped watch-position data (pct, pos) with savedAt | Writes to dedicated ff_last_visited key |
| CSS duplicates | @keyframes auth-in/out defined 3 times, .auth-overlay defined twice | Deduplicated — one canonical definition each |
| Feed reorder for unenrolled | saveFeedOrder saved empty array — order never persisted | Saves all section types |
| feyn:show-auth event | Dispatched in settings but no listener existed anywhere | Listener added in _app.js |
| syncLocalToSupabase | Did not upsert certificates | Certificates now synced on upgrade |
| signOut | Did not clear ff_upgrade_pending | Cleared on sign out |

# Feyn

A video-first learning platform built on the Feynman principle.  
**Stack**: Next.js 14 → static export → Netlify · No backend required.

---

## Quick Start (Local)

```bash
npm install
npm run dev
# → http://localhost:3000
```

---

## Deploy to GitHub + Netlify

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/feyn.git
git push -u origin main
```

### 2. Connect to Netlify

1. [app.netlify.com](https://app.netlify.com) → **Add new site → Import an existing project**
2. Select your GitHub repo
3. Build settings are auto-detected from `netlify.toml` (build: `npm run build`, publish: `out`)
4. Click **Deploy site**

Every push to `main` triggers a redeploy automatically.

---

## Using the Admin Panel

Go to `https://your-site.netlify.app/admin` (or `http://localhost:3000/admin` locally).

**Default password**: `feyn2024`  
→ Change it in `pages/admin.js`, line 6: `const ADMIN_PASSWORD = '...'`

### Workflow

1. Open `/admin` → enter password
2. Add/edit **Coaches** in the left panel first
3. Build your tree: **Programs → Subjects → Topics → Lessons**
4. For each lesson, paste the YouTube video ID and add a duration
5. Click **Generate courses.js** at the top right
6. Copy the output → paste into `data/courses.js` in your editor
7. `git add . && git commit -m "update courses" && git push`
8. Netlify redeploys in ~30 seconds ✓

The admin panel auto-saves your work-in-progress to `localStorage` so you won't lose it between sessions.

---

## Adding Coaches

Each coach needs an entry in `data/courses.js` under `coaches`:

```js
{
  id: "coach-slug",
  name: "Coach Name",
  title: "Lead Instructor",
  bio: "Short bio here.",
  avatar: "/coaches/name.jpg",       // place image in /public/coaches/
  signature: "/coaches/name-sig.png", // place signature PNG in /public/coaches/
  socials: {
    youtube: "https://youtube.com/@...",
    website: "https://..."
  }
}
```

Then reference coaches by their `id` in subjects and topics via `coachIds: ["coach-slug"]`.

---

## Features

| Feature | Details |
|---|---|
| **Profile page** | `/profile` — set username, view enrolled courses & progress |
| **Enrollment** | Click "Enroll" on any subject page — tracks per-device |
| **Progress tracking** | "Mark as watched" on each lesson, progress bars throughout |
| **Certificates** | Auto-unlocked at 100% completion on subjects with `certificate: true` |
| **Certificate PDF** | Dark-styled A4 PDF with name, course, date, cert ID, coach signature |
| **Coach pages** | `/coaches/[id]` — bio, socials, all courses and lessons listed |
| **Admin panel** | `/admin` — GUI to build the full course tree, outputs `courses.js` |
| **Donate prompts** | Subtle strips every 3rd lesson + topic pages + footer |

---

## URL Structure

```
/                                               → Home
/profile                                        → User profile & progress
/coaches/himel                                  → Coach page
/hsc/math                                       → Subject page
/hsc/math/linear-algebra                        → Topic page
/hsc/math/linear-algebra/what-is-a-vector       → Lesson + video
/admin                                          → Admin panel (password protected)
```

---

## Data Structure

Everything lives in `data/` (programs, subjects, topics, each in their own file).

```
Program
  └── Subject  (certificate: true/false, coachIds: [...])
        └── Topic  (coachIds: [...], primarySource: {...})
              └── Skill  (tier, prerequisiteIds: [...])
                    └── Lesson  (videoId, duration, title, intro, source: {...}, questions: [...])
```

### The Three-Role Model for Video Attribution

Feyn separates three distinct roles cleanly:

| Field | What it represents | Where used |
|---|---|---|
| `subject.coachIds` / `topic.coachIds` | Feyn's own curating instructors | Coach profile pages, certificates |
| `lesson.source.name` | Platform that produced the video (e.g. OnnoRokom Pathshala) | Attribution badge on lesson page |
| `lesson.source.instructor` | Person teaching in the video (e.g. Ratul Khan) | Attribution badge on lesson page |

**Coaches** (in `data/courseHelpers.js`) get profile pages at `/coaches/[id]` and sign certificates.
**Sources** are display-only attribution — they never get profile pages and never appear on certificates.

```js
// In a lesson:
source: {
  name: 'OnnoRokom Pathshala',
  instructor: 'Ratul Khan',
  url: 'https://www.youtube.com/@onnorokompathshala',
}
```

For supplementary (English) videos, attribution is embedded in the `materials` label:
```js
materials: [
  { id: 'km-1', label: 'Khan Academy — Projectile Motion (English)', url: '...', type: 'link' }
]
```

---

## Migrating to a Real Backend (future)

All user data logic is isolated in `lib/userStore.js`.  
To swap localStorage for Supabase/Firebase: reimplement the same exported functions — nothing else in the app needs to change.

Functions to reimplement: `getProfile`, `saveProfile`, `clearProfile`, `getEnrolled`, `isEnrolled`, `enroll`, `unenroll`, `getProgress`, `markWatched`, `unmarkWatched`, `isWatched`, `getSubjectProgress`, `getTopicProgress`, `getCerts`, `hasCert`, `issueCert`

---

## File Map

```
feyn/
├── data/courses.js          ← ALL content lives here (edit this)
├── lib/
│   ├── userStore.js         ← All user state (localStorage, swap-ready)
│   └── certificate.js       ← PDF certificate generator (jsPDF)
├── components/
│   └── Layout.js            ← Nav, Footer, Breadcrumb, CoachChip, ProgressBar, DonateStrip
├── pages/
│   ├── index.js             ← Home
│   ├── profile.js           ← User profile
│   ├── admin.js             ← Admin panel
│   ├── coaches/[coachId].js ← Coach page
│   └── [programId]/
│       ├── [subjectId].js
│       └── [subjectId]/
│           ├── [topicId].js
│           └── [topicId]/[lessonId].js
├── styles/globals.css       ← Full design system
└── netlify.toml             ← Netlify config (auto-detected)
```

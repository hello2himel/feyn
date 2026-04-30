# Feyn

> *"If you can't explain it simply, you don't understand it well enough."* — Richard Feynman

**Feyn** is a free, video-first learning platform built on the Feynman principle: watch a lesson that builds an idea from scratch, then answer questions that test whether you genuinely understood it — not just whether you watched. No memorisation. No skipped steps. No fluff.

Feyn is the educational platform of **STΛRGZR**, a community for students who believe learning should be driven by curiosity, not compliance. It grew out of *Feynman Files*, a peer-teaching series where students explained things the way they wished someone had explained them — the human way, not the textbook way.

---

## What Feyn Is

- **Video-first, understanding-first.** Every lesson starts from zero, assumes nothing, and earns your understanding before moving on.
- **Questions after every video.** Each lesson ends with questions that test real comprehension, not recall.
- **Completely free.** No paywalls, no ads, no hidden costs. Ever.
- **Curriculum + curiosity.** Full HSC, SSC and JSC coverage, plus interest courses in astronomy, programming, philosophy, mathematics and more.
- **Certificates.** Earn a verifiable PDF certificate (with QR code and coach signature) upon completing a subject.

---

## Features

| Feature | Details |
|---|---|
| **Lesson engine** | Video player with comprehension questions after each lesson |
| **Progress tracking** | Per-lesson "mark as watched", progress bars on all subject and topic pages |
| **Enrollment** | Enroll in any subject; your feed shows only your courses |
| **Continue watching** | Home screen resumes from your last-watched lesson |
| **Certificates** | Auto-issued PDF (A4, dark-styled) at 100% subject completion |
| **Certificate verification** | Public `/verify/:certId` page with QR code |
| **Coach pages** | `/coaches/[id]` — bio, socials, full course listing |
| **Profile page** | `/profile` — username, enrolled courses, progress overview |
| **Admin panel** | `/admin` — GUI to build the full content tree, exports `data/` files |
| **Role-based panels** | `/panels` — separate workflows for Admin, Coach, Editor, Publisher |
| **Search palette** | Global keyboard-driven course and lesson search |
| **Dark / light theme** | User-selectable in Settings |
| **Donate prompts** | Subtle strips every 3rd lesson, topic pages and footer |

---

## Content Catalogue

| Program | Type | Subjects |
|---|---|---|
| **HSC** | Academic | Physics, Chemistry, Mathematics, Biology |
| **SSC** | Academic | *(in preparation)* |
| **JSC** | Academic | *(in preparation)* |
| **Interests** | Curiosity | Astronomy, Mathematics, Philosophy, Programming |

Content lives entirely in `data/` — no CMS, no database round-trips at read time.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 14](https://nextjs.org/) (React 18) |
| Hosting | [Netlify](https://netlify.com) (SSR mode) |
| Auth & DB | [Supabase](https://supabase.com) — email OTP, Postgres, RLS |
| PDF generation | [jsPDF](https://github.com/parallax/jsPDF) |
| QR codes | [qrcode](https://github.com/soldair/node-qrcode) |
| Icons | [Remix Icon](https://remixicon.com/) (CDN) |
| Styling | Plain CSS custom properties — no CSS framework |

---

## Data Hierarchy

All content is structured as a five-level tree:

```
Program  (e.g. HSC, Interests)
  └── Subject  (e.g. Physics)          certificate: true/false, coachIds: [...]
        └── Topic  (e.g. Mechanics)    coachIds: [...], primarySource: {...}
              └── Skill  (e.g. Kinematics)   tier, prerequisiteIds: [...]
                    └── Lesson               videoId, duration, title, intro,
                                             source: {...}, questions: [...]
```

### Video Attribution — Three Roles

Feyn cleanly separates three distinct roles:

| Field | What it represents | Where used |
|---|---|---|
| `subject.coachIds` / `topic.coachIds` | Feyn's curating instructors | Coach profile pages, certificates |
| `lesson.source.name` | Platform that produced the video (e.g. OnnoRokom Pathshala) | Attribution badge on lesson page |
| `lesson.source.instructor` | Person teaching in the video (e.g. Ratul Khan) | Attribution badge on lesson page |

**Coaches** get profile pages at `/coaches/[id]` and sign certificates. **Sources** are display-only attribution — no profile pages, no certificates.

---

## URL Structure

```
/                                                    → Home / feed
/profile                                             → User profile & progress
/coaches/[id]                                        → Coach bio and courses
/[programId]/[subjectId]                             → Subject page
/[programId]/[subjectId]/[topicId]                   → Topic page
/[programId]/[subjectId]/[topicId]/[skillId]/[lessonId] → Lesson + video + questions
/verify/[certId]                                     → Certificate verification
/admin                                               → Admin content studio
/panels                                              → Role-based panel hub
```

---

## File Map

```
feyn/
├── data/
│   ├── index.js             ← Data entry point; exports merged program tree
│   ├── courseHelpers.js     ← Coach lookup, lesson counts, progress helpers
│   ├── programs/            ← hsc.js, ssc.js, jsc.js, interests.js, feyntest.js
│   ├── subjects/            ← One file per subject, grouped by program
│   └── topics/              ← One file per topic, grouped by program/subject
├── lib/
│   ├── userStore.js         ← All user state (Supabase-backed, localStorage cache)
│   ├── certificate.js       ← PDF certificate generator (jsPDF + QR)
│   ├── supabase.js          ← Supabase client singleton
│   ├── panelAccess.js       ← Role-based panel access control
│   └── panelStore.js        ← Panel draft state
├── components/
│   ├── Layout.js            ← Nav, Footer, Breadcrumb, CoachChip, ProgressBar, DonateStrip, AuthFlow
│   ├── LessonEngine.js      ← Video player + question flow
│   ├── SmartPlayer.js       ← YouTube embed with watch-position tracking
│   ├── SearchPalette.js     ← Global keyboard search
│   └── AuthFlow.js          ← Sign-up / sign-in / OTP / onboarding modal
├── pages/
│   ├── index.js             ← Home (guest landing + signed-in feed)
│   ├── profile.js           ← User profile
│   ├── settings.js          ← Account settings, theme, grade picker
│   ├── about.js             ← About Feyn / STΛRGZR
│   ├── admin.js             ← Admin content studio
│   ├── coaches/[coachId].js ← Coach profile page
│   ├── panels/              ← coach.js, editor.js, publisher.js
│   ├── verify/              ← Certificate verification
│   └── [programId]/
│       ├── [subjectId].js
│       └── [subjectId]/
│           ├── [topicId].js
│           └── [topicId]/[skillId]/[lessonId].js
├── styles/globals.css       ← Full design system (CSS custom properties)
├── supabase-schema.sql      ← Postgres schema + RLS policies
└── netlify.toml             ← Netlify build config
```

---

## Local Development

```bash
# 1. Install dependencies
npm install

# 2. Copy and fill in environment variables
cp .env.local.example .env.local
# Edit .env.local — see below

# 3. Start the dev server
npm run dev
# → http://localhost:3000
```

### Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key_here
```

Get these from **Supabase → Project Settings → API Keys**.  
Never commit `.env.local` — it is gitignored.

Optional panel access controls (comma-separated email lists):

```env
NEXT_PUBLIC_PANEL_ADMINS=admin@example.com
NEXT_PUBLIC_PANEL_COACHES=coach1@example.com,coach2@example.com
NEXT_PUBLIC_PANEL_EDITORS=editor@example.com
NEXT_PUBLIC_PANEL_PUBLISHERS=publisher@example.com
```

Admins automatically inherit editor and publisher access.

---

## Adding Content

To add a new topic:

1. Create `data/topics/{program}/{subject}/{topic}.js`
2. Import it in `data/subjects/{program}/{subject}.js`
3. Done — it flows up the tree automatically.

To add a new coach, create an entry in `data/courseHelpers.js` and reference their `id` via `coachIds` in the relevant subjects or topics.

---

## Panel Architecture

Feyn separates content operations across four role-based panels to avoid admin bottlenecks:

| Panel | Route | Responsibility |
|---|---|---|
| **Admin Content Studio** | `/admin` | Full taxonomy control — programs, subjects, topics, lessons, coaches |
| **Coach Studio** | `/panels/coach` | Coach profile drafts and lesson proposals |
| **Editor Review Desk** | `/panels/editor` | Proposal review, notes, status |
| **Publisher Console** | `/panels/publisher` | Release packaging checklist and publication |

---

## Database

The Supabase schema (`supabase-schema.sql`) creates four tables with row-level security:

- `profiles` — name, username, grade, onboarding state
- `enrollments` — which subjects a user is enrolled in
- `lesson_progress` — watched lessons per user
- `certificates` — issued certificates with verifiable IDs

User authentication uses email OTP (6-digit code). The custom email template is in `supabase-otp-email-template.html`.

---

## License

Feyn is free and open source, released under the [GNU Affero General Public License v3.0](LICENSE).  
You are free to use, study, modify and distribute it — provided derivative works are also released under AGPL-3.0.

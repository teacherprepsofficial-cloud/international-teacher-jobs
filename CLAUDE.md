# International Teacher Jobs — Project Instructions

## What This Is
A self-updating international school job board. Schools pay a monthly subscription to post jobs. AI crawls listed school sites and aggregates real job listings. Super-admin does QC before anything goes live.

## CRITICAL RULE: No Misrepresentation

**Every job listing on this site must be factually accurate to its source.**

### What we DO:
- Pull real job listings from real international school career pages
- Rewrite descriptions in our own words for consistency and readability
- Include ONLY facts that exist in the original listing: position title, school name, location, start date, contract type, salary (if listed), requirements, benefits

### What we NEVER do:
- Add qualifications, duties, or benefits that aren't in the original listing
- Fabricate salary ranges when none are listed
- Embellish job descriptions with "fluff" (extra responsibilities, skills, etc.)
- Infer or guess information that isn't explicitly stated
- Add details from the school's general website if they aren't in the specific job posting

### The Rule
If it's not in the source job listing, it doesn't go in our posting. Period.

When rewriting, we can rephrase for clarity and consistency, but the FACTS (school name, location, dates, requirements, benefits) must match the source exactly.

### Application Links
- Link to the ORIGINAL job listing URL (e.g., the TES page, the school's careers page) — never to our own form
- The "Apply Now" button sends users to the real application

## Tech Stack
- **Next.js 14** (App Router), TypeScript
- **MongoDB Atlas** (cluster: `international-teacher-j.kdutkod.mongodb.net`, db: `international-teacher-jobs`)
- **Tailwind CSS** with JetBrains Mono monospace font
- **Stripe** — 3-tier monthly subscriptions (Basic $49, Standard $99, Premium $199)
- **Vercel** — hosting (project: `international-teacher-jobs`)

## Database
- Separate MongoDB Atlas cluster from TeacherPreps — completely independent
- Connection via `MONGODB_URI` in `.env.local`
- Models: SchoolAdmin, JobPosting, AdminMessage

## Deployment
- GitHub: `teacherprepsofficial-cloud/international-teacher-jobs` (private)
- Vercel auto-deploys from `main` branch
- Live URL: https://international-teacher-jobs.vercel.app
- Vercel token: stored in memory (not in repo)

## Design
- Terminal/monospace aesthetic — JetBrains Mono font
- Colors: bg `#f4f4f4`, cards `#ffffff`, text `#1a1a1a`, accent red `#dc2626`, accent blue `#2563eb`
- Premium cards: gold left border, Featured cards: purple left border

## Job Posting Statuses
`pending` → `approved` → `live` → `correction_needed` → `taken_down`

## Subscription Tiers
| Tier | Price | Features |
|------|-------|----------|
| Basic | $49/mo | Standard listing |
| Standard | $99/mo | "Featured" purple badge, higher sort |
| Premium | $199/mo | "Premium" gold badge, pinned to top |

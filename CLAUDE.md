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
- **Stripe** — 3-tier monthly subscriptions (Starter $99, Plus $199, Premium $299)
- **Vercel** — hosting (project: `international-teacher-jobs`)

## Database
- Separate MongoDB Atlas cluster from TeacherPreps — completely independent
- Connection via `MONGODB_URI` in `.env.local`
- Models: SchoolAdmin, JobPosting, AdminMessage, CrawlRun

## Deployment
- GitHub: `teacherprepsofficial-cloud/international-teacher-jobs` (private)
- Vercel auto-deploys from `main` branch
- **Live URL: https://internationalteacherjobs.com** (custom domain, DNS at HostGator → Vercel)
- Also accessible at: https://international-teacher-jobs.vercel.app (Vercel default)
- Vercel token: stored in memory (not in repo)

## Domain & DNS (Added 2026-02-25)
- **Registrar**: HostGator (DNS managed there)
- **A record**: `@` → `76.76.21.21` (Vercel)
- **CNAME**: `www` → `cname.vercel-dns.com` (Vercel)
- **MX, SPF, DKIM, DMARC**: Managed at HostGator (for email)
- SSL: Auto-provisioned by Vercel

## Design
- Terminal/monospace aesthetic — JetBrains Mono font
- Colors: bg `#f4f4f4`, cards `#ffffff`, text `#1a1a1a`, accent red `#dc2626`, accent blue `#2563eb`
- Premium cards: gold left border, Featured cards: purple left border

## Job Posting Statuses
`pending` → `live` → `correction_needed` → `taken_down`

Admin "Approve" sets status directly to `live` (not `approved`). The public API only shows `live` jobs.

## Subscription Tiers
| Tier | Internal Key | Price | Active Listings | Features |
|------|-------------|-------|-----------------|----------|
| Starter | `basic` | $99/mo | Up to 3 | Standard listing, school profile |
| Plus | `standard` | $199/mo | Up to 10 | "Featured" purple badge, priority placement, school profile |
| Premium | `premium` | $299/mo | Up to 20 | "Premium" gold badge, pinned to top, school profile with logo |

### Posting Limits
Enforced in `POST /api/jobs` — counts active (`status: 'live'`) jobs per admin and rejects with 403 if limit reached.

```typescript
const TIER_LIMITS: Record<string, number> = {
  basic: 3,      // Starter $99/mo
  standard: 10,  // Plus $199/mo
  premium: 20,   // Premium $299/mo
}
```

## Job Crawler System (Added 2026-02-25)

### Overview
Automated crawler that pulls international school job listings from TES.com, deduplicates via SHA-256 content hash, and inserts them as `pending` for admin review. A separate stale checker verifies live jobs still exist at their source URL.

### Architecture
```
Daily Crawl (6 AM UTC)
  → Fetch TES.com international job search pages (up to 10 pages, 200 jobs)
  → Extract structured data from TES's embedded __NEXT_DATA__ JSON
  → Deduplicate via SHA-256 hash of (position + school + sourceUrl)
  → Insert new jobs as status: 'pending' for admin review
  → Log crawl run to CrawlRun collection

Stale Check (6 PM UTC)
  → Query all jobs with status: 'live' and isAutoCrawled: true
  → HEAD request each job's sourceUrl (10s timeout)
  → 3 consecutive failures → auto mark status: 'taken_down'
  → Successful check → reset fail count, update lastCheckedAt
```

### Key Files

| File | Purpose |
|------|---------|
| `lib/job-crawler/types.ts` | TypeScript interfaces |
| `lib/job-crawler/sources.ts` | Source registry (TES Phase 1) |
| `lib/job-crawler/parser.ts` | TES __NEXT_DATA__ JSON extraction, country code mapping, position categorization |
| `lib/job-crawler/crawler.ts` | Daily crawl orchestrator |
| `lib/job-crawler/stale-checker.ts` | Stale check orchestrator |
| `models/CrawlRun.ts` | Crawl history tracking model |
| `app/api/cron/daily-crawl/route.ts` | Vercel cron endpoint (6 AM UTC) |
| `app/api/cron/stale-check/route.ts` | Vercel cron endpoint (6 PM UTC) |
| `app/api/admin/crawl/route.ts` | Admin: trigger crawl/stale-check, view history |
| `scripts/create-crawler-admin.ts` | One-time: create system admin account |
| `scripts/run-crawl.ts` | Local CLI (`--backfill` for 50 pages) |
| `scripts/run-stale-check.ts` | Local CLI for stale check |
| `vercel.json` | Cron schedules |

### JobPosting Crawler Fields
- `sourceUrl` — Original job listing URL on TES
- `sourceKey` — Unique TES job ID (e.g., `tes-12345`)
- `contentHash` — SHA-256 hash for dedup (unique sparse index)
- `isAutoCrawled` — `true` for crawler jobs, `false` for manual submissions
- `lastCheckedAt` — Last stale check timestamp
- `staleCheckFailCount` — Consecutive HEAD request failures (auto take-down at 3)
- `crawledAt` — When the crawler first found this job

### Environment Variables (Crawler)
| Variable | Purpose |
|----------|---------|
| `CRAWLER_ADMIN_ID` | MongoDB ObjectId of the system admin account (owns all crawled jobs) |
| `CRON_SECRET` | Bearer token for authenticating cron endpoints |

### Running Locally
```bash
# First time: create crawler admin
npx tsx scripts/create-crawler-admin.ts

# Run crawl (10 pages default)
npx tsx scripts/run-crawl.ts

# Run crawl with backfill (50 pages)
npx tsx scripts/run-crawl.ts --backfill

# Run stale check
npx tsx scripts/run-stale-check.ts
```

### Admin Panel
- "Run Crawl Now" / "Run Stale Check" buttons
- Crawl history with run type, timestamp, results
- Crawled jobs show "AUTO" badge + "View source listing" link
- Approve button sets job directly to `live`

## Homepage Layout
- Date divider above each day's job group (based on `publishedAt`, NOT `createdAt`)
- "Total Jobs: X" counter on the same row as the first date divider (right-aligned)
- Count reflects total `live` jobs in the database (updates on every admin approval)
- Jobs API returns `{ jobs, totalLiveCount }` to power the counter

## Job Sorting — publishedAt-Based (Updated 2026-02-25)

**CRITICAL: Sort by `publishedAt`, NOT `createdAt`.** For crawled jobs, `createdAt` is when the crawler found the job (could be days ago), while `publishedAt` is when admin approved it. Sorting by `createdAt` buries newly approved jobs under old dates.

The GET `/api/jobs` endpoint sorts:
1. **Newest published day first** (using `publishedAt`, falling back to `createdAt` for legacy jobs)
2. **Within each day, by tier**: Premium → Plus → Starter
3. **Within same day + same tier**: most recently published first

The homepage date dividers also use `publishedAt` (with `createdAt` fallback) to group jobs by the day they went live.

This is the core value proposition for higher tiers — paid listings get priority placement within their day's group.

## Stripe Payment System

### Status: LIVE (keys configured 2026-02-25)
Shares the same Stripe account as TeacherPreps.com.

### Environment Variables (all set in `.env.local` + Vercel production)
| Variable | Status |
|----------|--------|
| `STRIPE_SECRET_KEY` | `sk_live_...` (set) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_...` (set) |
| `STRIPE_BASIC_PRICE_ID` | `price_1T4dr6Ahz6MDbiqoTP2yWszy` (set) |
| `STRIPE_STANDARD_PRICE_ID` | `price_1T4duiAhz6MDbiqo06sSNTHE` (set) |
| `STRIPE_PREMIUM_PRICE_ID` | `price_1T4dz9Ahz6MDbiqoCiqbfARk` (set) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` (set) |
| `NEXT_PUBLIC_APP_URL` | `https://international-teacher-jobs.vercel.app` (set) |

### Webhook Endpoint
- **URL**: `https://international-teacher-jobs.vercel.app/api/stripe/webhook`
- **ID**: `we_1T4fYTAhz6MDbiqo8D1Ljpol`
- **Events**: `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`

### Webhook Event Handling
| Event | Action |
|-------|--------|
| `checkout.session.completed` | Sets admin's tier, stripeCustomerId, subscriptionId, status → active |
| `invoice.paid` | Renews admin status → active |
| `customer.subscription.updated` | Syncs status (active / past_due) |
| `customer.subscription.deleted` | Sets status → cancelled, takes down all live job postings |
| `invoice.payment_failed` | Sets admin status → past_due |

### Key Files
| File | Purpose |
|------|---------|
| `app/api/stripe/create-checkout/route.ts` | Creates Stripe checkout session (passes adminId + tier in metadata) |
| `app/api/stripe/webhook/route.ts` | Handles all Stripe webhook events |
| `app/pricing/page.tsx` | Pricing page with 3 plans |
| `lib/stripe.ts` | Stripe client + price ID mapping |

## Header Navigation
- Public nav: Contact → Pricing → School Login → Post a Job
- School nav (when on `/school/*`): Dashboard → Logout
- Contact page: `/contact` (email: `hello@internationalteacherjobs.com`)

/**
 * ATS Platform Discovery Script
 *
 * For each school in our directory, this script attempts to find whether
 * the school uses Greenhouse, Lever, or Workable as their ATS platform.
 *
 * It does this by generating slug candidates from the school name and
 * testing them against each platform's public API endpoint.
 *
 * These are PUBLIC APIs — they power job listing widgets embedded on
 * employer websites and are designed to be called by third parties.
 * Using them is 100% legal with no ToS restrictions on this use case.
 *
 * Run: npx tsx scripts/discover-ats-platforms.ts
 * Options:
 *   --dry-run     Print results without saving to DB
 *   --limit N     Only process first N schools
 *   --platform P  Only test against: greenhouse | lever | workable
 */

import mongoose from 'mongoose'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

// ── Minimal inline schemas (avoid import path issues) ──────────────────────
const SchoolSchema = new mongoose.Schema({
  name: String, slug: String, country: String, countryCode: String,
  city: String, region: String,
  atsPlatform: String, atsSlug: String, atsDiscoveredAt: Date,
}, { strict: false, timestamps: true })

const School = mongoose.models.School || mongoose.model('School', SchoolSchema)

// ── CLI flags ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const LIMIT = (() => { const i = args.indexOf('--limit'); return i !== -1 ? parseInt(args[i + 1]) : 0 })()
const PLATFORM_FILTER = (() => { const i = args.indexOf('--platform'); return i !== -1 ? args[i + 1] : null })()

const DELAY_MS = 250   // ms between API calls — polite, non-aggressive
const TIMEOUT_MS = 8_000

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)) }

async function fetchJson(url: string, opts?: RequestInit): Promise<any | null> {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
    const res = await fetch(url, {
      ...opts,
      signal: ctrl.signal,
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...opts?.headers },
    })
    clearTimeout(t)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

// Schools rarely have more than 120 open positions.
// If a slug returns more than this, it's almost certainly the wrong company.
const MAX_SCHOOL_JOBS = 120

// Minimum slug length — slugs shorter than this are too generic and likely
// to match unrelated companies (e.g., "bis", "nice", "london").
const MIN_SLUG_LENGTH = 5

// ── Greenhouse ───────────────────────────────────────────────────────────────
// Also validates the company name in the HTML page to avoid false positives.
async function checkGreenhouse(slug: string, schoolName: string): Promise<number | null> {
  if (slug.length < MIN_SLUG_LENGTH) return null
  const data = await fetchJson(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(slug)}/jobs`)
  if (!data || !Array.isArray(data.jobs)) return null
  const count = data.jobs.length
  if (count > MAX_SCHOOL_JOBS) return null  // too many — not a school

  // Verify: fetch the Greenhouse board page HTML and check the company name
  // matches our school (prevents matching unrelated companies with same slug)
  if (!await verifyGreenhouseCompany(slug, schoolName)) return null

  return count
}

async function verifyGreenhouseCompany(slug: string, schoolName: string): Promise<boolean> {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
    const res = await fetch(`https://boards.greenhouse.io/${slug}`, {
      signal: ctrl.signal,
      headers: { Accept: 'text/html' },
    })
    clearTimeout(t)
    if (!res.ok) return false
    const html = await res.text()

    // Extract page title or company name — Greenhouse embeds the company name
    // in <title>, <h1 class="company-name">, or meta description
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    const h1Match = html.match(/<h1[^>]*class="[^"]*company[^"]*"[^>]*>([^<]+)<\/h1>/i)
    const nameInPage = (titleMatch?.[1] || h1Match?.[1] || '').toLowerCase()

    // Build a set of significant words from the school name for fuzzy matching
    const schoolWords = schoolName
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3 && !['school', 'international', 'academy', 'college', 'institute'].includes(w))

    // At least one significant word from the school name must appear in the page
    return schoolWords.some(w => nameInPage.includes(w))
  } catch {
    return false
  }
}

// ── Lever ────────────────────────────────────────────────────────────────────
async function checkLever(slug: string, schoolName: string): Promise<number | null> {
  if (slug.length < MIN_SLUG_LENGTH) return null
  const data = await fetchJson(`https://api.lever.co/v0/postings/${encodeURIComponent(slug)}?mode=json`)
  if (!Array.isArray(data)) return null
  const count = data.length
  if (count > MAX_SCHOOL_JOBS) return null

  // Verify company name via Lever's public page
  if (!await verifyLeverCompany(slug, schoolName)) return null

  return count
}

async function verifyLeverCompany(slug: string, schoolName: string): Promise<boolean> {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
    const res = await fetch(`https://jobs.lever.co/${slug}`, {
      signal: ctrl.signal,
      headers: { Accept: 'text/html' },
    })
    clearTimeout(t)
    if (!res.ok) return false
    const html = await res.text()

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    const nameInPage = (titleMatch?.[1] || '').toLowerCase()

    const schoolWords = schoolName
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3 && !['school', 'international', 'academy', 'college', 'institute'].includes(w))

    return schoolWords.some(w => nameInPage.includes(w))
  } catch {
    return false
  }
}

// ── Workable ─────────────────────────────────────────────────────────────────
async function checkWorkable(slug: string, schoolName: string): Promise<number | null> {
  if (slug.length < MIN_SLUG_LENGTH) return null
  const data = await fetchJson(
    `https://apply.workable.com/api/v3/accounts/${encodeURIComponent(slug)}/jobs`,
    { method: 'POST', body: JSON.stringify({ query: '', location: [], department: [], worktype: [], remote: false }) }
  )
  if (!data || !Array.isArray(data.results)) return null
  const count = data.results.length
  if (count > MAX_SCHOOL_JOBS) return null

  // Workable returns company_title in the response
  const companyTitle: string = (data.company_title || data.title || '').toLowerCase()
  if (!companyTitle) return count // can't verify, accept cautiously

  const schoolWords = schoolName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3 && !['school', 'international', 'academy', 'college', 'institute'].includes(w))

  return schoolWords.some(w => companyTitle.includes(w)) ? count : null
}

// ── Slug generation ──────────────────────────────────────────────────────────
function generateSlugs(name: string): string[] {
  const base = name
    .toLowerCase()
    // remove common suffixes that ATS slugs often drop
    .replace(/\b(international|school|academy|college|institute|university|the|of|in|at|for|and|a|an)\b/g, ' ')
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  const kebab = base.join('-')
  const joined = base.join('')

  // Also try with "school" kept in
  const withSchool = name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .join('-')

  // Acronym (only if 3+ words)
  const words = name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  const acronym = words.length >= 3 ? words.map(w => w[0]).join('') : null

  const candidates: string[] = [
    withSchool,          // american-school-of-dubai
    kebab,               // american-dubai (after stripping common words)
    joined,              // americandubai
  ]

  if (acronym) candidates.push(acronym)  // asd

  // Deduplicate and filter empties
  return [...new Set(candidates)].filter(s => s.length >= 3)
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  await mongoose.connect(process.env.MONGODB_URI as string)
  console.log('Connected to MongoDB')

  const query: any = {}
  // Skip schools that already have a confirmed ATS (re-run with --force to re-check)
  if (!args.includes('--force')) {
    query.atsPlatform = { $exists: false }
  }

  let schools = await School.find(query).lean()
  if (LIMIT > 0) schools = schools.slice(0, LIMIT)

  console.log(`Testing ${schools.length} schools for ATS platforms…`)
  if (DRY_RUN) console.log('  DRY RUN — no changes will be saved\n')

  let found = 0
  let tested = 0

  for (const school of schools) {
    tested++
    const slugCandidates = generateSlugs(school.name as string)

    let discovered = false

    for (const slug of slugCandidates) {
      // Greenhouse
      if (!PLATFORM_FILTER || PLATFORM_FILTER === 'greenhouse') {
        const count = await checkGreenhouse(slug, school.name as string)
        await delay(DELAY_MS)
        if (count !== null) {
          console.log(`✅ GREENHOUSE  ${school.name}  →  slug: ${slug}  (${count} jobs)`)
          if (!DRY_RUN) {
            await School.updateOne(
              { _id: school._id },
              { $set: { atsPlatform: 'greenhouse', atsSlug: slug, atsDiscoveredAt: new Date() } }
            )
          }
          found++
          discovered = true
          break
        }
      }

      // Lever
      if (!PLATFORM_FILTER || PLATFORM_FILTER === 'lever') {
        const count = await checkLever(slug, school.name as string)
        await delay(DELAY_MS)
        if (count !== null) {
          console.log(`✅ LEVER       ${school.name}  →  slug: ${slug}  (${count} jobs)`)
          if (!DRY_RUN) {
            await School.updateOne(
              { _id: school._id },
              { $set: { atsPlatform: 'lever', atsSlug: slug, atsDiscoveredAt: new Date() } }
            )
          }
          found++
          discovered = true
          break
        }
      }

      // Workable
      if (!PLATFORM_FILTER || PLATFORM_FILTER === 'workable') {
        const count = await checkWorkable(slug, school.name as string)
        await delay(DELAY_MS)
        if (count !== null) {
          console.log(`✅ WORKABLE    ${school.name}  →  slug: ${slug}  (${count} jobs)`)
          if (!DRY_RUN) {
            await School.updateOne(
              { _id: school._id },
              { $set: { atsPlatform: 'workable', atsSlug: slug, atsDiscoveredAt: new Date() } }
            )
          }
          found++
          discovered = true
          break
        }
      }

      if (discovered) break
    }

    if (tested % 50 === 0) {
      console.log(`  … tested ${tested}/${schools.length}, found ${found} so far`)
    }
  }

  console.log(`\n══════════════════════════════════════`)
  console.log(`Discovery complete`)
  console.log(`  Schools tested:  ${tested}`)
  console.log(`  ATS platforms found: ${found}`)
  console.log(`  Schools with no ATS match: ${tested - found}`)
  if (DRY_RUN) console.log(`  (Dry run — no changes saved)`)

  await mongoose.disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })

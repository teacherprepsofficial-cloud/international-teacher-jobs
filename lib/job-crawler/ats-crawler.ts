/**
 * ATS (Applicant Tracking System) Crawler
 *
 * Pulls job listings directly from schools' own ATS platforms via their
 * public APIs. These APIs are designed to be public — they power the job
 * listing widgets embedded on school websites. Using them is 100% legal.
 *
 * Supported platforms:
 *  - Greenhouse:  boards-api.greenhouse.io/v1/boards/{slug}/jobs
 *  - Lever:       api.lever.co/v0/postings/{slug}?mode=json
 *  - Workable:    apply.workable.com/api/v3/accounts/{slug}/jobs  (POST)
 */

import { connectDB } from '@/lib/db'
import { JobPosting } from '@/models/JobPosting'
import { School } from '@/models/School'
import { computeContentHash } from './parser'
import { CrawledJob, CrawlResult } from './types'
import { getRegionForCountryCode } from '@/lib/regions'

const FETCH_TIMEOUT = 12_000
const DELAY_MS = 300 // polite delay between API calls

function delay(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

// ---------------------------------------------------------------------------
// Position category inference from job title
// ---------------------------------------------------------------------------
function inferCategory(
  title: string
): 'elementary' | 'middle-school' | 'high-school' | 'admin' | 'support-staff' {
  const t = title.toLowerCase()
  if (/\b(principal|director|head of|superintendent|coordinator|counselor|advisor|registrar|admissions)\b/.test(t)) return 'admin'
  if (/\b(technician|accountant|finance|it support|librarian|nurse|chef|driver|maintenance|custodian|receptionist|secretary|assistant)\b/.test(t)) return 'support-staff'
  if (/\b(high school|secondary|grade (9|10|11|12)|ib diploma|a[- ]level|senior)\b/.test(t)) return 'high-school'
  if (/\b(middle school|grade (6|7|8)|junior high|ms[/ ])\b/.test(t)) return 'middle-school'
  if (/\b(elementary|primary|grade [k1-5]|kindergarten|early childhood|pre[-]?k|reception|nursery|ey[fr]s)\b/.test(t)) return 'elementary'
  // Default for plain subject teachers (assume secondary is most common in intl schools)
  return 'high-school'
}

// ---------------------------------------------------------------------------
// Strip HTML tags and normalise whitespace for descriptions
// ---------------------------------------------------------------------------
function stripHtml(html: string, maxLen = 800): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen)
}

// ---------------------------------------------------------------------------
// Greenhouse
// Public API: https://boards-api.greenhouse.io/v1/boards/{slug}/jobs
// Returns { jobs: [...], meta: { total } }
// ---------------------------------------------------------------------------
async function fetchGreenhouseJobs(slug: string): Promise<CrawledJob[] | null> {
  const url = `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT)
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } })
    clearTimeout(t)
    if (!res.ok) return null
    const data = await res.json()
    if (!Array.isArray(data.jobs)) return null

    return data.jobs.map((j: any) => {
      const location: string = j.location?.name ?? ''
      // Greenhouse location is usually "City, Country" or just "Country"
      const parts = location.split(',').map((s: string) => s.trim())
      const city = parts.length > 1 ? parts[0] : ''
      const countryRaw = parts[parts.length - 1] ?? ''

      return {
        position: j.title ?? 'Teaching Position',
        schoolName: slug, // will be replaced by caller with real school name
        city,
        country: countryRaw,
        countryCode: '',   // caller fills
        region: '',        // caller fills
        description: stripHtml(j.content ?? ''),
        sourceUrl: j.absolute_url ?? `https://boards.greenhouse.io/${slug}/jobs/${j.id}`,
        sourceKey: `greenhouse-${slug}-${j.id}`,
        contractType: 'Full-time',
        positionCategory: inferCategory(j.title ?? ''),
      } as CrawledJob
    })
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Lever
// Public API: https://api.lever.co/v0/postings/{slug}?mode=json
// Returns array of posting objects
// ---------------------------------------------------------------------------
async function fetchLeverJobs(slug: string): Promise<CrawledJob[] | null> {
  const url = `https://api.lever.co/v0/postings/${slug}?mode=json`
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT)
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } })
    clearTimeout(t)
    if (!res.ok) return null
    const data = await res.json()
    if (!Array.isArray(data)) return null

    return data.map((j: any) => {
      const location: string = j.categories?.location ?? j.workplaceType ?? ''
      const parts = location.split(',').map((s: string) => s.trim())
      const city = parts.length > 1 ? parts[0] : ''
      const countryRaw = parts[parts.length - 1] ?? ''

      return {
        position: j.text ?? 'Teaching Position',
        schoolName: slug,
        city,
        country: countryRaw,
        countryCode: '',
        region: '',
        description: stripHtml(j.descriptionPlain ?? j.description ?? ''),
        sourceUrl: j.hostedUrl ?? `https://jobs.lever.co/${slug}/${j.id}`,
        sourceKey: `lever-${slug}-${j.id}`,
        contractType: 'Full-time',
        positionCategory: inferCategory(j.text ?? ''),
      } as CrawledJob
    })
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Workable
// Public API: POST https://apply.workable.com/api/v3/accounts/{slug}/jobs
// This is the same endpoint their own widget uses — fully public
// ---------------------------------------------------------------------------
async function fetchWorkableJobs(slug: string): Promise<CrawledJob[] | null> {
  const url = `https://apply.workable.com/api/v3/accounts/${slug}/jobs`
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT)
    const res = await fetch(url, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query: '', location: [], department: [], worktype: [], remote: false }),
    })
    clearTimeout(t)
    if (!res.ok) return null
    const data = await res.json()
    const jobs: any[] = data.results ?? []

    return jobs.map((j: any) => {
      const location: string = j.location?.city ?? j.location?.country ?? ''
      const countryRaw: string = j.location?.country ?? ''
      const city: string = j.location?.city ?? ''

      return {
        position: j.title ?? 'Teaching Position',
        schoolName: slug,
        city,
        country: countryRaw,
        countryCode: '',
        region: '',
        description: stripHtml(j.description ?? ''),
        sourceUrl: `https://apply.workable.com/${slug}/j/${j.shortcode}/`,
        sourceKey: `workable-${slug}-${j.shortcode}`,
        contractType: j.employment_type === 'part_time' ? 'Part-time' : 'Full-time',
        positionCategory: inferCategory(j.title ?? ''),
      } as CrawledJob
    })
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// COUNTRY_CODE_MAP — used to fill in countryCode from location string
// ---------------------------------------------------------------------------
const COUNTRY_CODE_MAP: Record<string, string> = {
  'united arab emirates': 'AE', 'uae': 'AE', 'dubai': 'AE', 'abu dhabi': 'AE',
  'saudi arabia': 'SA', 'qatar': 'QA', 'bahrain': 'BH', 'oman': 'OM', 'kuwait': 'KW',
  'china': 'CN', 'hong kong': 'HK', 'japan': 'JP', 'south korea': 'KR', 'korea': 'KR',
  'thailand': 'TH', 'vietnam': 'VN', 'malaysia': 'MY', 'singapore': 'SG',
  'indonesia': 'ID', 'philippines': 'PH', 'taiwan': 'TW', 'india': 'IN',
  'egypt': 'EG', 'morocco': 'MA', 'nigeria': 'NG', 'kenya': 'KE', 'south africa': 'ZA',
  'united kingdom': 'GB', 'uk': 'GB', 'england': 'GB', 'germany': 'DE',
  'france': 'FR', 'spain': 'ES', 'italy': 'IT', 'netherlands': 'NL',
  'switzerland': 'CH', 'austria': 'AT', 'belgium': 'BE', 'portugal': 'PT',
  'sweden': 'SE', 'norway': 'NO', 'denmark': 'DK', 'finland': 'FI',
  'turkey': 'TR', 'russia': 'RU', 'ukraine': 'UA', 'poland': 'PL',
  'brazil': 'BR', 'colombia': 'CO', 'mexico': 'MX', 'chile': 'CL', 'peru': 'PE',
  'australia': 'AU', 'new zealand': 'NZ', 'canada': 'CA', 'united states': 'US',
  'jordan': 'JO', 'lebanon': 'LB', 'israel': 'IL', 'pakistan': 'PK',
  'ghana': 'GH', 'ethiopia': 'ET', 'tanzania': 'TZ', 'rwanda': 'RW', 'zambia': 'ZM',
  'czech republic': 'CZ', 'hungary': 'HU', 'romania': 'RO', 'greece': 'GR',
  'kazakhstan': 'KZ', 'georgia': 'GE', 'azerbaijan': 'AZ',
}

function resolveCountryCode(country: string): string {
  return COUNTRY_CODE_MAP[country.toLowerCase().trim()] ?? ''
}

// ---------------------------------------------------------------------------
// Main ATS crawl — called from the main crawler
// ---------------------------------------------------------------------------
export async function runAtsCrawl(crawlerAdminId: string): Promise<CrawlResult> {
  const result: CrawlResult = {
    source: 'ats-platforms',
    jobsFound: 0,
    jobsNew: 0,
    jobsSkipped: 0,
    errors: [],
    durationMs: 0,
  }
  const start = Date.now()

  // Load all schools with a confirmed ATS platform
  const schools = await School.find({
    atsPlatform: { $exists: true, $ne: null },
    atsSlug: { $exists: true, $ne: null },
  }).lean()

  console.log(`[ATS Crawler] Found ${schools.length} schools with ATS platforms`)

  for (const school of schools) {
    const platform = school.atsPlatform!
    const slug = school.atsSlug!
    const schoolId = school._id.toString()

    let jobs: CrawledJob[] | null = null

    if (platform === 'greenhouse') jobs = await fetchGreenhouseJobs(slug)
    else if (platform === 'lever') jobs = await fetchLeverJobs(slug)
    else if (platform === 'workable') jobs = await fetchWorkableJobs(slug)

    if (!jobs) {
      result.errors.push(`${school.name}: failed to fetch from ${platform}/${slug}`)
      await delay(DELAY_MS)
      continue
    }

    result.jobsFound += jobs.length

    for (const job of jobs) {
      // Use school's known location as fallback for jobs with missing location
      const countryCode = resolveCountryCode(job.country) || school.countryCode
      const region = countryCode ? getRegionForCountryCode(countryCode) : school.region
      const country = job.country || school.country
      const city = job.city || school.city || ''

      const contentHash = computeContentHash(job.position, school.name, job.sourceUrl)

      const existing = await JobPosting.findOne({ contentHash })
      if (existing) {
        result.jobsSkipped++
        continue
      }

      try {
        await JobPosting.create({
          adminId: crawlerAdminId,
          schoolId,
          schoolName: school.name,
          city,
          country,
          countryCode,
          region,
          position: job.position,
          positionCategory: job.positionCategory,
          description: job.description,
          applicationUrl: job.sourceUrl,
          contractType: job.contractType,
          subscriptionTier: 'basic',
          status: 'live',
          publishedAt: new Date(),
          sourceUrl: job.sourceUrl,
          sourceKey: job.sourceKey,
          contentHash,
          isAutoCrawled: true,
          crawledAt: new Date(),
          staleCheckFailCount: 0,
        })
        result.jobsNew++
      } catch (err: any) {
        if (err.code === 11000) {
          result.jobsSkipped++
        } else {
          result.errors.push(`Insert "${job.position}" at ${school.name}: ${err.message}`)
        }
      }
    }

    await delay(DELAY_MS)
  }

  result.durationMs = Date.now() - start
  console.log(
    `[ATS Crawler] Done: ${result.jobsNew} new, ${result.jobsSkipped} skipped, ${result.errors.length} errors`
  )
  return result
}

/**
 * Direct School Career Page Crawler
 *
 * For schools where we know the career page URL but don't have an embedded ATS,
 * this crawler fetches the HTML and extracts job listings using heuristic parsing.
 *
 * Supported patterns:
 *  - Simple list/table pages (most school career pages)
 *  - BambooHR public listings
 *  - SchoolSpring embeds
 *  - Generic pages with job title + link patterns
 *
 * Called from the main runCrawl() function or standalone.
 */

import { connectDB } from '@/lib/db'
import { JobPosting } from '@/models/JobPosting'
import { School } from '@/models/School'
import { computeContentHash } from './parser'
import { CrawlResult } from './types'
import { getRegionForCountryCode } from '@/lib/regions'

const FETCH_TIMEOUT = 15_000
const DELAY_MS = 1_500  // polite — this hits real school websites, not APIs

type ExtractedJob = {
  title: string
  url: string
  description?: string
  location?: string
}

function delay(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT)
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    })
    clearTimeout(t)
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}

// ── BambooHR public jobs API ──────────────────────────────────────────────────
// When a school's career page embeds BambooHR, the public jobs are at:
// https://{company}.bamboohr.com/jobs/embed2.php
async function fetchBambooHrJobs(careerPageUrl: string, html: string): Promise<ExtractedJob[] | null> {
  // Extract subdomain from embedded BambooHR URL
  const match = html.match(/bamboohr\.com\/(?:jobs\/)?([a-zA-Z0-9_-]+)/i)
  if (!match) return null
  const subdomain = match[1]

  try {
    const apiUrl = `https://${subdomain}.bamboohr.com/jobs/embed2.php`
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT)
    const res = await fetch(apiUrl, {
      signal: ctrl.signal,
      headers: { Accept: 'text/html' },
    })
    clearTimeout(t)
    if (!res.ok) return null
    const embedHtml = await res.text()

    // Parse job listings from BambooHR embed HTML
    return extractJobsFromBambooHr(embedHtml, subdomain)
  } catch {
    return null
  }
}

function extractJobsFromBambooHr(html: string, subdomain: string): ExtractedJob[] {
  const jobs: ExtractedJob[] = []
  // BambooHR embed HTML structure: <a class="jss-apply-link" href="...">Title</a>
  const linkPattern = /href="([^"]*bamboohr\.com[^"]+)">([^<]+)</gi
  let m: RegExpExecArray | null
  while ((m = linkPattern.exec(html)) !== null) {
    const url = m[1]
    const title = m[2].trim()
    if (title && url && !title.toLowerCase().includes('apply')) {
      jobs.push({ title, url })
    }
  }

  // Also try the JSON endpoint
  // BambooHR has a public JSON API: https://{subdomain}.bamboohr.com/careers/{company}/list
  // But this requires knowing the exact company path, so we rely on the embed above

  return jobs
}

// ── Generic heuristic HTML job extractor ─────────────────────────────────────
// Looks for common job listing patterns in school career page HTML.
function extractJobsFromHtml(html: string, baseUrl: string): ExtractedJob[] {
  const jobs: ExtractedJob[] = []
  const seen = new Set<string>()

  // Pattern 1: Links containing job-related keywords in the anchor text
  // e.g., <a href="/apply/teacher-english">English Teacher</a>
  const linkPattern = /<a[^>]+href="([^"]+)"[^>]*>([^<]{5,120})<\/a>/gi
  const jobTitleKeywords = /teacher|professor|instructor|principal|director|coordinator|librarian|counselor|coach|administrator|faculty|staff|educator|tutor|assistant|position|vacancy|opportunity/i

  let m: RegExpExecArray | null
  while ((m = linkPattern.exec(html)) !== null) {
    const rawUrl = m[1]
    const text = m[2].replace(/\s+/g, ' ').trim()

    if (!jobTitleKeywords.test(text)) continue
    if (text.length < 5 || text.length > 120) continue
    // Avoid navigation links
    if (/^(home|about|contact|news|events|alumni|admission|parents|students|calendar)/i.test(text)) continue

    // Resolve relative URL
    let url = rawUrl
    if (url.startsWith('/')) {
      const base = new URL(baseUrl)
      url = `${base.origin}${url}`
    } else if (!url.startsWith('http')) {
      continue  // skip javascript: etc.
    }

    const key = url.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)

    jobs.push({ title: text, url })
  }

  // Pattern 2: <li> or <tr> elements containing job titles with nearby links
  // e.g., <li><strong>English Teacher</strong> ... <a href="/apply">Apply</a></li>
  const listItemPattern = /<(?:li|tr)[^>]*>([\s\S]{0,800}?)<\/(?:li|tr)>/gi
  while ((m = listItemPattern.exec(html)) !== null) {
    const content = m[1]
    if (!jobTitleKeywords.test(content)) continue

    // Extract the most likely job title from this list item
    const titleMatch = content.match(/<(?:strong|h[1-6]|b|span)[^>]*>([^<]{5,100})<\/(?:strong|h[1-6]|b|span)>/)
    if (!titleMatch) continue
    const title = titleMatch[1].replace(/\s+/g, ' ').trim()
    if (!jobTitleKeywords.test(title)) continue

    // Find the best link in this list item
    const linkMatch = content.match(/href="([^"]+)"/)
    if (!linkMatch) continue
    let url = linkMatch[1]
    if (url.startsWith('/')) {
      const base = new URL(baseUrl)
      url = `${base.origin}${url}`
    } else if (!url.startsWith('http')) continue

    const key = url.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)

    jobs.push({ title, url })
  }

  return jobs
}

// ── Detect and fetch BambooHR embedded listings ───────────────────────────────
async function extractJobsFromPage(url: string): Promise<ExtractedJob[]> {
  const html = await fetchHtml(url)
  if (!html) return []

  // Check for BambooHR embed
  if (/bamboohr\.com/i.test(html)) {
    const bambooJobs = await fetchBambooHrJobs(url, html)
    if (bambooJobs && bambooJobs.length > 0) return bambooJobs
  }

  // Check for iframes pointing to ATS (skip — we can't scrape inside iframes)
  if (/icims\.com|taleo\.net|workday\.com|pageup\.com|successfactors\.com/i.test(html)) {
    // These are iframed ATS — we can't scrape them from here without the API
    // Return empty — the discover-school-websites.ts atsDetected field handles these
    return []
  }

  // Generic HTML extraction
  return extractJobsFromHtml(html, url)
}

// ── Infer position category from job title ────────────────────────────────────
function inferCategory(
  title: string
): 'elementary' | 'middle-school' | 'high-school' | 'admin' | 'support-staff' {
  const t = title.toLowerCase()
  if (/\b(principal|director|head of|superintendent|coordinator|counselor|advisor|registrar|admissions)\b/.test(t)) return 'admin'
  if (/\b(technician|accountant|finance|it support|librarian|nurse|chef|driver|maintenance|custodian|receptionist|secretary|assistant)\b/.test(t)) return 'support-staff'
  if (/\b(high school|secondary|grade (9|10|11|12)|ib diploma|a[- ]level|senior)\b/.test(t)) return 'high-school'
  if (/\b(middle school|grade (6|7|8)|junior high)\b/.test(t)) return 'middle-school'
  if (/\b(elementary|primary|grade [k1-5]|kindergarten|early childhood|pre[-]?k|reception|nursery|eyfs)\b/.test(t)) return 'elementary'
  return 'high-school'
}

// ── Main career page crawl ────────────────────────────────────────────────────
export async function runCareerPageCrawl(crawlerAdminId: string): Promise<CrawlResult> {
  const result: CrawlResult = {
    source: 'school-career-pages',
    jobsFound: 0,
    jobsNew: 0,
    jobsSkipped: 0,
    errors: [],
    durationMs: 0,
  }
  const start = Date.now()

  // Load schools that have a career page but no ATS platform
  // (schools WITH atsPlatform are handled by ats-crawler.ts)
  const schools = await School.find({
    careerPageUrl: { $exists: true, $ne: null },
    $or: [
      { atsPlatform: { $exists: false } },
      { atsPlatform: null },
    ],
    // Only crawl schools where ATS was NOT detected (those we can't handle via API)
    $and: [
      { $or: [{ atsDetected: { $exists: false } }, { atsDetected: null },
               { atsDetected: { $in: ['bamboohr'] } }] },
    ],
  }).lean()

  console.log(`[Career Page Crawler] Found ${schools.length} schools with crawlable career pages`)

  for (const school of schools) {
    const careerUrl = school.careerPageUrl as string
    const jobs = await extractJobsFromPage(careerUrl)

    if (jobs.length === 0) {
      await delay(DELAY_MS)
      continue
    }

    result.jobsFound += jobs.length
    console.log(`[Career Page] ${school.name}: ${jobs.length} jobs found`)

    for (const job of jobs) {
      const contentHash = computeContentHash(job.title, school.name as string, job.url)
      const existing = await JobPosting.findOne({ contentHash })
      if (existing) { result.jobsSkipped++; continue }

      try {
        await JobPosting.create({
          adminId: crawlerAdminId,
          schoolId: school._id.toString(),
          schoolName: school.name,
          city: school.city || '',
          country: school.country || '',
          countryCode: school.countryCode || '',
          region: school.region || '',
          position: job.title,
          positionCategory: inferCategory(job.title),
          description: job.description || '',
          applicationUrl: job.url,
          contractType: 'Full-time',
          subscriptionTier: 'basic',
          status: 'live',
          publishedAt: new Date(),
          sourceUrl: job.url,
          sourceKey: `career-page-${school.slug}-${Buffer.from(job.url).toString('base64').slice(0, 12)}`,
          contentHash,
          isAutoCrawled: true,
          crawledAt: new Date(),
          staleCheckFailCount: 0,
        })
        result.jobsNew++
      } catch (err: any) {
        if (err.code === 11000) result.jobsSkipped++
        else result.errors.push(`Insert "${job.title}" at ${school.name}: ${err.message}`)
      }
    }

    await delay(DELAY_MS)
  }

  result.durationMs = Date.now() - start
  console.log(
    `[Career Page Crawler] Done: ${result.jobsNew} new, ${result.jobsSkipped} skipped, ${result.errors.length} errors`
  )
  return result
}

import { connectDB } from '@/lib/db'
import { JobPosting } from '@/models/JobPosting'
import { CrawlRun } from '@/models/CrawlRun'
import { JOB_SOURCES } from './sources'
import { parseTesNextData, parseSeekTeachersHtml, parseTieOnlineHtml, parseIsjFeedXml, computeContentHash } from './parser'
import { School } from '@/models/School'
import { runAtsCrawl } from './ats-crawler'
import { runCareerPageCrawl } from './career-page-crawler'
import { CrawledJob, CrawlResult } from './types'

const FETCH_TIMEOUT = 15_000 // 15 seconds
const DELAY_BETWEEN_PAGES = 2_000 // 2 seconds between page fetches

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function fetchPage(url: string): Promise<string> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT)

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    })

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`)
    }

    return await res.text()
  } finally {
    clearTimeout(timeout)
  }
}

export async function runCrawl(maxPagesOverride?: number): Promise<CrawlResult[]> {
  await connectDB()
  const results: CrawlResult[] = []
  const crawlRunStart = Date.now()

  // Get the crawler admin ID from env
  const crawlerAdminId = process.env.CRAWLER_ADMIN_ID
  if (!crawlerAdminId) {
    throw new Error('CRAWLER_ADMIN_ID env var is not set. Run scripts/create-crawler-admin.ts first.')
  }

  for (const source of JOB_SOURCES) {
    const sourceStart = Date.now()
    const result: CrawlResult = {
      source: source.id,
      jobsFound: 0,
      jobsNew: 0,
      jobsSkipped: 0,
      errors: [],
      durationMs: 0,
    }

    const maxPages = maxPagesOverride ?? source.maxPages

    try {
      for (let page = 1; page <= maxPages; page++) {
        const separator = source.searchUrl.includes('?') ? '&' : '?'
        const pageUrl = page === 1
          ? source.searchUrl
          : `${source.searchUrl}${separator}page=${page}`

        console.log(`[Crawler] Fetching ${source.id} page ${page}/${maxPages}: ${pageUrl}`)

        let html: string
        try {
          html = await fetchPage(pageUrl)
        } catch (err: any) {
          result.errors.push(`Page ${page}: ${err.message}`)
          console.error(`[Crawler] Failed to fetch page ${page}:`, err.message)
          break // Stop paginating on fetch error
        }

        // Parse jobs from this page using the appropriate parser
        console.log(`[Crawler] Page ${page}: fetched ${html.length} bytes`)
        let pageJobs: CrawledJob[]
        switch (source.parserType) {
          case 'seekteachers':
            pageJobs = parseSeekTeachersHtml(html, source.baseUrl)
            break
          case 'tieonline':
            pageJobs = parseTieOnlineHtml(html, source.baseUrl)
            break
          case 'isj-feed':
            pageJobs = parseIsjFeedXml(html, source.baseUrl)
            break
          case 'tes':
          default:
            pageJobs = parseTesNextData(html, source.baseUrl)
            break
        }
        console.log(`[Crawler] Page ${page}: parsed ${pageJobs.length} jobs from HTML`)

        // Filter out UK domestic jobs for TES (keep if school name contains "international")
        if (source.id === 'tes-international') {
          pageJobs = pageJobs.filter(job => {
            if (job.countryCode !== 'GB') return true
            return /international/i.test(job.schoolName)
          })
          console.log(`[Crawler] Page ${page}: ${pageJobs.length} after UK domestic filter`)
        }

        if (pageJobs.length === 0) {
          if (page === 1) {
            const errMsg = `CRITICAL: Page 1 returned 0 jobs for ${source.id} — source URL or parser may be broken`
            console.error(`[Crawler] ${errMsg}`)
            result.errors.push(errMsg)
          } else {
            console.log(`[Crawler] No more jobs on page ${page}, stopping pagination`)
          }
          break
        }

        result.jobsFound += pageJobs.length

        // Deduplicate and insert
        for (const job of pageJobs) {
          const contentHash = computeContentHash(job.position, job.schoolName, job.sourceUrl)

          // Check if this job already exists
          const existing = await JobPosting.findOne({ contentHash })
          if (existing) {
            result.jobsSkipped++
            continue
          }

          try {
            const newJob = await JobPosting.create({
              adminId: crawlerAdminId,
              schoolName: job.schoolName,
              city: job.city,
              country: job.country,
              countryCode: job.countryCode,
              region: job.region,
              position: job.position,
              positionCategory: job.positionCategory,
              description: job.description || `${job.position} at ${job.schoolName} in ${job.city}, ${job.country}. View the full listing for details.`,
              applicationUrl: job.sourceUrl,
              salary: job.salary,
              contractType: job.contractType,
              startDate: job.startDate || 'TBD',
              subscriptionTier: 'basic',
              status: 'live',
              publishedAt: new Date(),
              // Crawler-specific fields
              sourceUrl: job.sourceUrl,
              sourceKey: job.sourceKey,
              contentHash,
              isAutoCrawled: true,
              crawledAt: new Date(),
              staleCheckFailCount: 0,
            })
            result.jobsNew++

            // Auto-link to school directory if name matches
            if (!newJob.schoolId && job.schoolName) {
              try {
                const school = await School.findOne({
                  name: { $regex: new RegExp(`^${job.schoolName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
                })
                if (school) {
                  await JobPosting.updateOne({ _id: newJob._id }, { schoolId: school._id })
                }
              } catch { /* non-critical — skip */ }
            }
          } catch (err: any) {
            // Handle duplicate key error (race condition)
            if (err.code === 11000) {
              result.jobsSkipped++
            } else {
              result.errors.push(`Insert error for "${job.position}": ${err.message}`)
            }
          }
        }

        // Rate limit between pages
        if (page < maxPages) {
          await delay(DELAY_BETWEEN_PAGES)
        }
      }
    } catch (err: any) {
      result.errors.push(`Source error: ${err.message}`)
    }

    result.durationMs = Date.now() - sourceStart
    results.push(result)
    console.log(`[Crawler] ${source.id}: ${result.jobsNew} new, ${result.jobsSkipped} skipped, ${result.errors.length} errors`)
  }

  // Run ATS platform crawl (Greenhouse, Lever, Workable)
  try {
    const atsResult = await runAtsCrawl(crawlerAdminId)
    results.push(atsResult)
  } catch (err: any) {
    console.error('[ATS Crawl] Fatal error:', err.message)
    results.push({
      source: 'ats-platforms',
      jobsFound: 0,
      jobsNew: 0,
      jobsSkipped: 0,
      errors: [err.message],
      durationMs: 0,
    })
  }

  // Run direct school career page crawl
  try {
    const careerPageResult = await runCareerPageCrawl(crawlerAdminId)
    results.push(careerPageResult)
  } catch (err: any) {
    console.error('[Career Page Crawl] Fatal error:', err.message)
    results.push({
      source: 'school-career-pages',
      jobsFound: 0,
      jobsNew: 0,
      jobsSkipped: 0,
      errors: [err.message],
      durationMs: 0,
    })
  }

  // Log crawl run
  const totalNew = results.reduce((sum, r) => sum + r.jobsNew, 0)
  const totalFound = results.reduce((sum, r) => sum + r.jobsFound, 0)
  const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0)

  await CrawlRun.create({
    type: 'crawl',
    startedAt: new Date(crawlRunStart),
    completedAt: new Date(),
    durationMs: Date.now() - crawlRunStart,
    jobsFound: totalFound,
    jobsNew: totalNew,
    jobsSkipped: totalFound - totalNew,
    crawlErrors: results.flatMap(r => r.errors),
    sourceResults: results,
  })

  return results
}

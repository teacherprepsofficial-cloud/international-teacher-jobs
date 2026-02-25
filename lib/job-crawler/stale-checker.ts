import { connectDB } from '@/lib/db'
import { JobPosting } from '@/models/JobPosting'
import { CrawlRun } from '@/models/CrawlRun'
import { StaleCheckResult } from './types'

const CHECK_TIMEOUT = 10_000 // 10 seconds per request
const BATCH_SIZE = 10
const BATCH_DELAY = 2_000 // 2 seconds between batches
const MAX_FAIL_COUNT = 3 // Auto take-down after this many consecutive failures

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function checkUrl(url: string): Promise<{ alive: boolean; statusCode: number }> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), CHECK_TIMEOUT)

  try {
    const res = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    })

    return { alive: res.ok, statusCode: res.status }
  } catch (err: any) {
    // Timeout or network error
    return { alive: false, statusCode: 0 }
  } finally {
    clearTimeout(timeout)
  }
}

export async function runStaleCheck(): Promise<StaleCheckResult> {
  await connectDB()
  const start = Date.now()

  const result: StaleCheckResult = {
    totalChecked: 0,
    stillLive: 0,
    markedTakenDown: 0,
    failedChecks: 0,
    errors: [],
    durationMs: 0,
  }

  // Get all live auto-crawled jobs with a sourceUrl
  const liveJobs = await JobPosting.find({
    status: 'live',
    isAutoCrawled: true,
    sourceUrl: { $exists: true, $ne: null },
  }).lean()

  console.log(`[StaleCheck] Found ${liveJobs.length} live auto-crawled jobs to check`)

  // Process in batches
  for (let i = 0; i < liveJobs.length; i += BATCH_SIZE) {
    const batch = liveJobs.slice(i, i + BATCH_SIZE)

    const checks = batch.map(async (job: any) => {
      result.totalChecked++

      try {
        const { alive, statusCode } = await checkUrl(job.sourceUrl)

        if (alive) {
          // Job still exists — reset fail count
          await JobPosting.updateOne(
            { _id: job._id },
            {
              $set: { lastCheckedAt: new Date(), staleCheckFailCount: 0 },
            }
          )
          result.stillLive++
          console.log(`  [OK] ${job.position} at ${job.schoolName} (${statusCode})`)
        } else {
          // Job gone or error — increment fail count
          const newFailCount = (job.staleCheckFailCount || 0) + 1
          const update: any = {
            lastCheckedAt: new Date(),
            staleCheckFailCount: newFailCount,
          }

          if (newFailCount >= MAX_FAIL_COUNT) {
            // Auto take-down after 3 consecutive failures
            update.status = 'taken_down'
            update.adminNotes = `Auto taken down: source URL returned ${statusCode || 'timeout'} for ${newFailCount} consecutive checks (last: ${new Date().toISOString()})`
            result.markedTakenDown++
            console.log(`  [TAKEN DOWN] ${job.position} at ${job.schoolName} (${newFailCount} failures, status ${statusCode})`)
          } else {
            result.failedChecks++
            console.log(`  [FAIL ${newFailCount}/${MAX_FAIL_COUNT}] ${job.position} at ${job.schoolName} (${statusCode})`)
          }

          await JobPosting.updateOne({ _id: job._id }, { $set: update })
        }
      } catch (err: any) {
        result.errors.push(`Check failed for job ${job._id}: ${err.message}`)
        console.error(`  [ERROR] ${job.position}:`, err.message)
      }
    })

    await Promise.all(checks)

    // Rate limit between batches
    if (i + BATCH_SIZE < liveJobs.length) {
      await delay(BATCH_DELAY)
    }
  }

  result.durationMs = Date.now() - start

  // Log the stale check run
  await CrawlRun.create({
    type: 'stale-check',
    startedAt: new Date(start),
    completedAt: new Date(),
    durationMs: result.durationMs,
    jobsFound: result.totalChecked,
    jobsNew: 0,
    jobsSkipped: result.stillLive,
    crawlErrors: result.errors,
    staleCheckResults: {
      totalChecked: result.totalChecked,
      stillLive: result.stillLive,
      markedTakenDown: result.markedTakenDown,
      failedChecks: result.failedChecks,
    },
  })

  console.log(`[StaleCheck] Done: ${result.stillLive} live, ${result.markedTakenDown} taken down, ${result.failedChecks} pending (${result.durationMs}ms)`)
  return result
}

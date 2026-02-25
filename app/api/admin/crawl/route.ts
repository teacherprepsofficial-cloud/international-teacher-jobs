import { connectDB } from '@/lib/db'
import { CrawlRun } from '@/models/CrawlRun'
import { runCrawl } from '@/lib/job-crawler/crawler'
import { runStaleCheck } from '@/lib/job-crawler/stale-checker'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// GET: Fetch crawl history
export async function GET() {
  try {
    await connectDB()

    const runs = await CrawlRun.find()
      .sort({ createdAt: -1 })
      .limit(20)
      .lean()

    return NextResponse.json(runs)
  } catch (error: any) {
    console.error('[Admin Crawl] Error fetching history:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST: Trigger a crawl or stale check manually
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, maxPages } = body

    if (action === 'crawl') {
      console.log('[Admin Crawl] Manual crawl triggered')
      const results = await runCrawl(maxPages)
      const totalNew = results.reduce((sum, r) => sum + r.jobsNew, 0)
      const totalFound = results.reduce((sum, r) => sum + r.jobsFound, 0)

      return NextResponse.json({
        success: true,
        summary: { jobsFound: totalFound, jobsNew: totalNew },
        results,
      })
    }

    if (action === 'stale-check') {
      console.log('[Admin Crawl] Manual stale check triggered')
      const result = await runStaleCheck()
      return NextResponse.json({ success: true, result })
    }

    return NextResponse.json({ error: 'Invalid action. Use "crawl" or "stale-check".' }, { status: 400 })
  } catch (error: any) {
    console.error('[Admin Crawl] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

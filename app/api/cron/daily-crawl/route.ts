import { NextRequest, NextResponse } from 'next/server'
import { runCrawl } from '@/lib/job-crawler/crawler'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes max for Vercel

export async function GET(request: NextRequest) {
  try {
    // Verify authorization: Vercel cron header, Bearer token, or admin
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    const isVercelCron = request.headers.get('x-vercel-cron') === '1'
    const isBearerAuth = cronSecret && authHeader === `Bearer ${cronSecret}`

    if (!isVercelCron && !isBearerAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[Daily Crawl] Starting...')
    const results = await runCrawl()

    const totalNew = results.reduce((sum, r) => sum + r.jobsNew, 0)
    const totalFound = results.reduce((sum, r) => sum + r.jobsFound, 0)

    return NextResponse.json({
      success: true,
      summary: {
        jobsFound: totalFound,
        jobsNew: totalNew,
        sources: results.length,
      },
      results,
    })
  } catch (error: any) {
    console.error('[Daily Crawl] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

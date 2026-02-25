import { NextRequest, NextResponse } from 'next/server'
import { runStaleCheck } from '@/lib/job-crawler/stale-checker'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes max for Vercel

export async function GET(request: NextRequest) {
  try {
    // Verify authorization: Vercel cron header or Bearer token
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    const isVercelCron = request.headers.get('x-vercel-cron') === '1'
    const isBearerAuth = cronSecret && authHeader === `Bearer ${cronSecret}`

    if (!isVercelCron && !isBearerAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[Stale Check] Starting...')
    const result = await runStaleCheck()

    return NextResponse.json({
      success: true,
      result,
    })
  } catch (error: any) {
    console.error('[Stale Check] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

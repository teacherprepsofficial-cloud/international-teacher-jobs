import { connectDB } from '@/lib/db'
import { Subscriber } from '@/models/Subscriber'
import { JobPosting } from '@/models/JobPosting'
import { buildDigestHtml, buildNoJobsHtml } from '@/lib/digest-email'
import { Resend } from 'resend'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const resend = new Resend(process.env.RESEND_API_KEY)

export async function GET(request: NextRequest) {
  try {
    // Auth: Vercel cron or Bearer token
    const isVercelCron = request.headers.get('x-vercel-cron') === '1'
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    const isBearerAuth = cronSecret && authHeader === `Bearer ${cronSecret}`

    if (!isVercelCron && !isBearerAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    // Get jobs published in the last 7 days
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

    const jobs = await (JobPosting as any).find({
      status: 'live',
      publishedAt: { $gte: oneWeekAgo },
    }).sort({ publishedAt: -1 }).lean()

    // Get all confirmed subscribers
    const subscribers = await (Subscriber as any).find({ status: 'confirmed' }).lean()

    if (subscribers.length === 0) {
      return NextResponse.json({ success: true, message: 'No subscribers to send to', emailsSent: 0 })
    }

    const digestDate = new Date().toISOString()
    let sent = 0
    let failed = 0

    // Send to each subscriber
    for (const sub of subscribers) {
      try {
        const html = jobs.length > 0
          ? buildDigestHtml(jobs as any, sub._id.toString(), sub.unsubscribeToken, digestDate)
          : buildNoJobsHtml(sub.unsubscribeToken)

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://internationalteacherjobs.com'
        const unsubUrl = `${baseUrl}/api/unsubscribe?token=${sub.unsubscribeToken}`

        const subject = jobs.length > 0
          ? `${jobs.length} new international teaching ${jobs.length === 1 ? 'job' : 'jobs'} this week`
          : 'International Teacher Jobs — Weekly Update'

        await resend.emails.send({
          from: 'International Teacher Jobs <jobs@send.internationalteacherjobs.com>',
          to: sub.email,
          subject,
          html,
          headers: {
            'List-Unsubscribe': `<${unsubUrl}>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          },
        })
        sent++
      } catch (err) {
        console.error(`Failed to send to ${sub.email}:`, err)
        failed++
      }
    }

    return NextResponse.json({
      success: true,
      digestDate,
      jobsIncluded: jobs.length,
      emailsSent: sent,
      emailsFailed: failed,
      totalSubscribers: subscribers.length,
    })
  } catch (error: any) {
    console.error('[Weekly Digest] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

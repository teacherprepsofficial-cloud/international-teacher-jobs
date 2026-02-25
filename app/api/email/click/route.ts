import { connectDB } from '@/lib/db'
import { EmailClick } from '@/models/EmailClick'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    await connectDB()

    const subscriberId = request.nextUrl.searchParams.get('sid')
    const jobId = request.nextUrl.searchParams.get('jid')
    const digestDate = request.nextUrl.searchParams.get('d')
    const redirectUrl = request.nextUrl.searchParams.get('url')

    if (!redirectUrl) {
      return NextResponse.redirect(process.env.NEXT_PUBLIC_APP_URL || 'https://internationalteacherjobs.com')
    }

    // Track the click (fire and forget — don't block redirect)
    if (subscriberId && jobId && digestDate) {
      try {
        await (EmailClick as any).create({
          subscriberId,
          jobId,
          digestDate: new Date(digestDate),
        })
      } catch {
        // Duplicate or error — don't block the redirect
      }
    }

    return NextResponse.redirect(redirectUrl)
  } catch {
    return NextResponse.redirect(process.env.NEXT_PUBLIC_APP_URL || 'https://internationalteacherjobs.com')
  }
}

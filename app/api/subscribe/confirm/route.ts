import { connectDB } from '@/lib/db'
import { Subscriber } from '@/models/Subscriber'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    await connectDB()

    const token = request.nextUrl.searchParams.get('token')
    if (!token) {
      return new NextResponse(confirmPage('Invalid confirmation link.', false), {
        headers: { 'Content-Type': 'text/html' },
      })
    }

    const subscriber = await (Subscriber as any).findOne({ confirmToken: token })

    if (!subscriber) {
      return new NextResponse(confirmPage('Invalid or expired confirmation link.', false), {
        headers: { 'Content-Type': 'text/html' },
      })
    }

    if (subscriber.status === 'confirmed') {
      return new NextResponse(confirmPage("You're already confirmed!", true), {
        headers: { 'Content-Type': 'text/html' },
      })
    }

    subscriber.status = 'confirmed'
    subscriber.confirmedAt = new Date()
    await subscriber.save()

    return new NextResponse(confirmPage("You're subscribed! You'll receive new job listings every Thursday.", true), {
      headers: { 'Content-Type': 'text/html' },
    })
  } catch (error) {
    console.error('Confirm error:', error)
    return new NextResponse(confirmPage('Something went wrong. Please try again.', false), {
      status: 500,
      headers: { 'Content-Type': 'text/html' },
    })
  }
}

function confirmPage(message: string, success: boolean): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://internationalteacherjobs.com'
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${success ? 'Confirmed' : 'Error'} — International Teacher Jobs</title>
  <style>
    body { font-family: 'Courier New', monospace; background: #f4f4f4; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
    .card { background: #fff; border: 1px solid #e0e0e0; border-radius: 15px; padding: 40px; max-width: 420px; text-align: center; }
    .icon { font-size: 48px; margin-bottom: 16px; }
    h1 { font-size: 20px; margin-bottom: 12px; color: #1a1a1a; }
    p { font-size: 14px; color: #666; line-height: 1.6; }
    a { display: inline-block; margin-top: 20px; background: #1a1a1a; color: #fff; text-decoration: none; padding: 10px 28px; border-radius: 9999px; font-size: 13px; font-weight: 600; }
    a:hover { opacity: 0.9; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${success ? '✅' : '❌'}</div>
    <h1>${success ? 'All set!' : 'Oops'}</h1>
    <p>${message}</p>
    <a href="${baseUrl}">Browse Jobs</a>
  </div>
</body>
</html>`
}

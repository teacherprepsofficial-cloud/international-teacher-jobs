import { connectDB } from '@/lib/db'
import { Subscriber } from '@/models/Subscriber'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    await connectDB()

    const token = request.nextUrl.searchParams.get('token')
    if (!token) {
      return new NextResponse(unsubPage('Invalid unsubscribe link.', false), {
        headers: { 'Content-Type': 'text/html' },
      })
    }

    const subscriber = await (Subscriber as any).findOne({ unsubscribeToken: token })

    if (!subscriber) {
      return new NextResponse(unsubPage('Invalid or expired unsubscribe link.', false), {
        headers: { 'Content-Type': 'text/html' },
      })
    }

    if (subscriber.status === 'unsubscribed') {
      return new NextResponse(unsubPage("You're already unsubscribed.", true), {
        headers: { 'Content-Type': 'text/html' },
      })
    }

    subscriber.status = 'unsubscribed'
    subscriber.unsubscribedAt = new Date()
    await subscriber.save()

    return new NextResponse(unsubPage("You've been unsubscribed. You won't receive any more emails from us.", true), {
      headers: { 'Content-Type': 'text/html' },
    })
  } catch (error) {
    console.error('Unsubscribe error:', error)
    return new NextResponse(unsubPage('Something went wrong. Please try again.', false), {
      status: 500,
      headers: { 'Content-Type': 'text/html' },
    })
  }
}

function unsubPage(message: string, success: boolean): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://internationalteacherjobs.com'
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Unsubscribed — International Teacher Jobs</title>
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
    <div class="icon">${success ? '👋' : '❌'}</div>
    <h1>${success ? 'Unsubscribed' : 'Oops'}</h1>
    <p>${message}</p>
    <a href="${baseUrl}">Back to Jobs</a>
  </div>
</body>
</html>`
}

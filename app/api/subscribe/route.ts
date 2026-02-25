import { connectDB } from '@/lib/db'
import { Subscriber } from '@/models/Subscriber'
import { Resend } from 'resend'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
    await connectDB()

    const { email } = await request.json()
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Check if already exists
    const existing = await (Subscriber as any).findOne({ email: normalizedEmail })

    if (existing) {
      if (existing.status === 'confirmed') {
        return NextResponse.json({ message: "You're already subscribed!" })
      }
      if (existing.status === 'unsubscribed') {
        // Re-subscribe: reset to pending, generate new confirm token
        existing.status = 'pending'
        existing.confirmToken = require('crypto').randomBytes(32).toString('hex')
        existing.unsubscribedAt = undefined
        await existing.save()
        await sendConfirmationEmail(normalizedEmail, existing.confirmToken)
        return NextResponse.json({ message: 'Check your email to confirm your subscription!' })
      }
      // Still pending — resend confirmation
      await sendConfirmationEmail(normalizedEmail, existing.confirmToken)
      return NextResponse.json({ message: 'Check your email to confirm your subscription!' })
    }

    // Create new subscriber
    const subscriber = await (Subscriber as any).create({ email: normalizedEmail })
    await sendConfirmationEmail(normalizedEmail, subscriber.confirmToken)

    return NextResponse.json({ message: 'Check your email to confirm your subscription!' })
  } catch (error: any) {
    console.error('Subscribe error:', error)
    return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 })
  }
}

async function sendConfirmationEmail(email: string, token: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://internationalteacherjobs.com'
  const confirmUrl = `${baseUrl}/api/subscribe/confirm?token=${token}`

  await resend.emails.send({
    from: 'International Teacher Jobs <jobs@send.internationalteacherjobs.com>',
    to: email,
    subject: 'Confirm your subscription — International Teacher Jobs',
    html: `
      <div style="font-family: 'Courier New', monospace; max-width: 500px; margin: 0 auto; padding: 24px;">
        <h2 style="font-size: 18px; margin-bottom: 16px;">Confirm your subscription</h2>
        <p style="font-size: 14px; color: #666; line-height: 1.6; margin-bottom: 24px;">
          You signed up to receive weekly international teaching job listings.
          Click below to confirm your email:
        </p>
        <a href="${confirmUrl}" style="display: inline-block; background: #1a1a1a; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 9999px; font-size: 14px; font-weight: 600;">
          Confirm Subscription
        </a>
        <p style="font-size: 12px; color: #999; margin-top: 24px;">
          If you didn't sign up, just ignore this email.
        </p>
      </div>
    `,
  })
}

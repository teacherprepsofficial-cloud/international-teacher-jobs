import { NextRequest, NextResponse } from 'next/server'
import stripe, { STRIPE_PRICE_IDS } from '@/lib/stripe'
import { getAuthCookie, verifyToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { tier } = await request.json()

    if (!tier || !['basic', 'standard', 'premium'].includes(tier)) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 })
    }

    const priceId = STRIPE_PRICE_IDS[tier as keyof typeof STRIPE_PRICE_IDS]
    if (!priceId) {
      return NextResponse.json({ error: 'Price ID not configured' }, { status: 500 })
    }

    const authToken = await getAuthCookie()
    if (!authToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const payload = verifyToken(authToken)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://international-teacher-jobs.vercel.app'

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: payload.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/school/dashboard?checkout=success`,
      cancel_url: `${baseUrl}/pricing`,
      metadata: {
        tier,
        adminId: payload.adminId,
      },
    })

    return NextResponse.json({ sessionId: session.id })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}

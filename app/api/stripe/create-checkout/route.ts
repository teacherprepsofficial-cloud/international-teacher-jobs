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

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://international-teacher-jobs.vercel.app'

    // Check if school admin is logged in (optional — works for both logged-in and anonymous)
    let adminId: string | undefined
    let email: string | undefined

    const authToken = await getAuthCookie()
    if (authToken) {
      const payload = verifyToken(authToken)
      if (payload) {
        adminId = payload.adminId
        email = payload.email
      }
    }

    const sessionParams: any = {
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/pricing`,
      metadata: { tier },
    }

    // If logged in, attach admin info
    if (adminId) {
      sessionParams.metadata.adminId = adminId
    }
    if (email) {
      sessionParams.customer_email = email
    }

    // For new schools: collect email + school name via Stripe's custom fields
    if (!adminId) {
      sessionParams.custom_fields = [
        {
          key: 'school_name',
          label: { type: 'custom', custom: 'School Name' },
          type: 'text',
        },
        {
          key: 'contact_name',
          label: { type: 'custom', custom: 'Your Name' },
          type: 'text',
        },
      ]
    }

    const session = await stripe.checkout.sessions.create(sessionParams)

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error('Checkout error:', error?.message || error)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}

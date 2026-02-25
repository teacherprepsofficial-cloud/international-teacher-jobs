import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import stripe from '@/lib/stripe'
import { connectDB } from '@/lib/db'
import { SchoolAdmin } from '@/models/SchoolAdmin'
import { JobPosting } from '@/models/JobPosting'

export async function POST(request: NextRequest) {
  await connectDB()

  const body = await request.text()
  const sig = request.headers.get('stripe-signature') || ''

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        // TODO: Create school admin account and set subscription
        break
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        // TODO: Renew job listing
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        // Find school admin by Stripe customer ID
        const admin = await SchoolAdmin.findOne({ stripeCustomerId: customerId })
        if (admin) {
          admin.subscriptionStatus = 'cancelled'
          await admin.save()

          // Take down all their job postings
          await JobPosting.updateMany(
            { adminId: admin._id },
            { status: 'taken_down' }
          )
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string

        // Find school admin and notify
        const admin = await SchoolAdmin.findOne({ stripeCustomerId: customerId })
        if (admin) {
          admin.subscriptionStatus = 'past_due'
          await admin.save()
          // TODO: Send email notification
        }
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

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
        const adminId = session.metadata?.adminId
        const tier = session.metadata?.tier as 'basic' | 'standard' | 'premium'
        const customerId = session.customer as string
        const subscriptionId = session.subscription as string

        if (adminId && tier) {
          await SchoolAdmin.findByIdAndUpdate(adminId, {
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            subscriptionTier: tier,
            subscriptionStatus: 'active',
          })
          console.log(`Checkout complete: admin ${adminId} → ${tier} plan`)
        }
        break
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string

        // Renewal payment succeeded — ensure status is active
        const admin = await SchoolAdmin.findOne({ stripeCustomerId: customerId })
        if (admin) {
          admin.subscriptionStatus = 'active'
          await admin.save()
          console.log(`Invoice paid: admin ${admin._id} subscription renewed`)
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        const admin = await SchoolAdmin.findOne({ stripeCustomerId: customerId })
        if (admin) {
          // Update status based on subscription state
          if (subscription.status === 'active') {
            admin.subscriptionStatus = 'active'
          } else if (subscription.status === 'past_due') {
            admin.subscriptionStatus = 'past_due'
          }
          await admin.save()
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        const admin = await SchoolAdmin.findOne({ stripeCustomerId: customerId })
        if (admin) {
          admin.subscriptionStatus = 'cancelled'
          await admin.save()

          // Take down all their job postings
          await JobPosting.updateMany(
            { adminId: admin._id, status: 'live' },
            { status: 'taken_down' }
          )
          console.log(`Subscription cancelled: admin ${admin._id}, jobs taken down`)
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string

        const admin = await SchoolAdmin.findOne({ stripeCustomerId: customerId })
        if (admin) {
          admin.subscriptionStatus = 'past_due'
          await admin.save()
          console.log(`Payment failed: admin ${admin._id} → past_due`)
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

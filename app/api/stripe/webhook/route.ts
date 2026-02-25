import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import stripe from '@/lib/stripe'
import { connectDB } from '@/lib/db'
import { SchoolAdmin } from '@/models/SchoolAdmin'
import { JobPosting } from '@/models/JobPosting'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

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
        const customerEmail = session.customer_details?.email || session.customer_email

        if (adminId) {
          // Existing school admin upgrading — update their record
          await SchoolAdmin.findByIdAndUpdate(adminId, {
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            subscriptionTier: tier,
            subscriptionStatus: 'active',
          })
          console.log(`Checkout complete: existing admin ${adminId} → ${tier} plan`)
        } else if (customerEmail) {
          // New school signing up via anonymous checkout
          // Check if admin already exists with this email
          let admin = await SchoolAdmin.findOne({ email: customerEmail.toLowerCase() })

          // Extract custom fields (school name, contact name)
          const schoolName = session.custom_fields?.find(f => f.key === 'school_name')?.text?.value || 'My School'
          const contactName = session.custom_fields?.find(f => f.key === 'contact_name')?.text?.value || 'Admin'

          if (admin) {
            // Existing admin paying — just upgrade
            admin.stripeCustomerId = customerId
            admin.stripeSubscriptionId = subscriptionId
            admin.subscriptionTier = tier
            admin.subscriptionStatus = 'active'
            await admin.save()
            console.log(`Checkout complete: existing admin ${admin._id} (by email) → ${tier} plan`)
          } else {
            // Brand new school — create account with temp password
            const tempPassword = crypto.randomBytes(8).toString('hex')
            const passwordHash = await bcrypt.hash(tempPassword, 10)

            admin = await SchoolAdmin.create({
              email: customerEmail.toLowerCase(),
              name: contactName,
              schoolName: schoolName,
              passwordHash,
              stripeCustomerId: customerId,
              stripeSubscriptionId: subscriptionId,
              subscriptionTier: tier,
              subscriptionStatus: 'active',
              needsPasswordReset: true,
            })
            console.log(`New school admin created: ${customerEmail} → ${tier} plan (needs password setup)`)
            // TODO: Send welcome email with password setup link
          }
        }
        break
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string

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

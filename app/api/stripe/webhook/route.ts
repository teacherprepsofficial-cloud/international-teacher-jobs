import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import stripe from '@/lib/stripe'
import { connectDB } from '@/lib/db'
import { SchoolAdmin } from '@/models/SchoolAdmin'
import { JobPosting } from '@/models/JobPosting'
import { Resend } from 'resend'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

const resend = new Resend(process.env.RESEND_API_KEY)

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

            // Send welcome email with temporary password
            const tierNames: Record<string, string> = { basic: 'Starter', standard: 'Plus', premium: 'Premium' }
            const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://internationalteacherjobs.com'
            try {
              await resend.emails.send({
                from: 'International Teacher Jobs <hello@internationalteacherjobs.com>',
                to: customerEmail,
                subject: 'Welcome to International Teacher Jobs — Your Login Credentials',
                html: `
                  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px;">
                    <h1 style="font-size: 24px; margin-bottom: 8px;">Welcome, ${contactName}!</h1>
                    <p style="color: #555; font-size: 15px; line-height: 1.6;">
                      Your <strong>${tierNames[tier] || 'Starter'}</strong> plan is active. Here are your login credentials:
                    </p>

                    <div style="background: #f4f7fa; border-radius: 8px; padding: 20px; margin: 24px 0;">
                      <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Email:</strong> ${customerEmail}</p>
                      <p style="margin: 0; font-size: 14px;"><strong>Temporary Password:</strong> <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${tempPassword}</code></p>
                    </div>

                    <a href="${siteUrl}/school/login" style="display: inline-block; background: #2563eb; color: #fff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 15px;">
                      Log In &amp; Post Your First Job
                    </a>

                    <p style="color: #888; font-size: 13px; margin-top: 28px; line-height: 1.5;">
                      We recommend changing your password after logging in. If you have questions, reply to this email.
                    </p>
                  </div>
                `,
              })
              console.log(`Welcome email sent to ${customerEmail}`)
            } catch (emailErr) {
              console.error('Failed to send welcome email:', emailErr)
              // Don't fail the webhook — account is created, email is best-effort
            }
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

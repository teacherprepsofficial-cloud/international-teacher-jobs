'use client'

import { useState } from 'react'
import Link from 'next/link'
import { loadStripe } from '@stripe/stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '')

const PLANS = [
  {
    tier: 'basic',
    name: 'Starter',
    price: '$99',
    description: 'Perfect for schools getting started',
    features: [
      'Up to 3 active job listings',
      'Standard positioning',
      'School profile',
      '30-day active postings',
    ],
  },
  {
    tier: 'standard',
    name: 'Plus',
    price: '$199',
    description: 'Higher visibility for growing schools',
    features: [
      'Up to 10 active job listings',
      'Featured badge on all listings',
      'Priority placement in search',
      'School profile',
      'Priority support',
    ],
    badge: 'MOST POPULAR',
  },
  {
    tier: 'premium',
    name: 'Premium',
    price: '$299',
    description: 'Maximum visibility & reach',
    features: [
      'Up to 20 active job listings',
      'Premium badge on all listings',
      'Pinned to top of listings',
      'School profile with logo',
      'Priority support',
      'Featured status included',
    ],
    badge: 'BEST VALUE',
  },
]

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null)

  const handleCheckout = async (tier: string) => {
    setLoading(tier)
    try {
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      })

      const { sessionId } = await response.json()
      const stripe = await stripePromise
      await stripe?.redirectToCheckout({ sessionId })
    } catch (error) {
      console.error('Checkout failed:', error)
      alert('Failed to start checkout. Please try again.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h1>
        <p className="text-text-muted">Pay monthly. Cancel anytime. All plans include job posting & updates.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {PLANS.map((plan) => (
          <div
            key={plan.tier}
            className={`rounded-[15px] border-2 px-6 py-8 relative ${
              plan.badge
                ? 'border-accent-blue bg-blue-50'
                : 'border-card-border bg-card-bg'
            }`}
          >
            {plan.badge && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent-blue text-white text-xs font-bold px-3 py-1 rounded-full">
                {plan.badge}
              </div>
            )}

            <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
            <div className="mb-4">
              <span className="text-4xl font-bold">{plan.price}</span>
              <span className="text-text-muted">/month</span>
            </div>
            <p className="text-sm text-text-muted mb-6">{plan.description}</p>

            <ul className="space-y-3 mb-8">
              {plan.features.map((feature) => (
                <li key={feature} className="text-sm flex items-start gap-2">
                  <span className="text-accent-blue font-bold mt-0.5">✓</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleCheckout(plan.tier)}
              disabled={loading === plan.tier}
              className={`w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed ${
                plan.badge ? 'bg-accent-blue' : ''
              }`}
            >
              {loading === plan.tier ? 'Loading...' : 'Get Started'}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-12 text-center text-sm text-text-muted">
        <p>Need help? <Link href="/contact" className="text-accent-blue hover:underline">Contact us</Link></p>
      </div>
    </div>
  )
}

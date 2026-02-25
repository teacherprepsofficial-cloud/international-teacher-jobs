'use client'

import { useState } from 'react'
import Link from 'next/link'

const PLANS = [
  {
    tier: 'basic',
    name: 'Starter',
    price: '$99',
    description: '3 job posts per month',
    features: [
      'Standard positioning',
      'School profile',
      'Best for smaller schools',
    ],
  },
  {
    tier: 'standard',
    name: 'Plus',
    price: '$199',
    description: '10 job posts per month',
    features: [
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
    description: '20 job posts per month',
    features: [
      'Premium badge on all listings',
      'Pinned to top of listings',
      'School profile',
      'Priority support',
      'Featured status included',
    ],
    badge: 'BEST VALUE',
    badgeColor: 'orange',
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

      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        alert(data.error || 'Failed to start checkout. Please try again.')
      }
    } catch (error) {
      console.error('Checkout failed:', error)
      alert('Failed to start checkout. Please try again.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="container mx-auto px-3 sm:px-4 py-6 md:py-12">
      <div className="text-center mb-6 sm:mb-8 md:mb-12">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 sm:mb-4">Simple, Transparent Pricing</h1>
        <p className="text-sm sm:text-base text-text-muted">Pay monthly. Cancel anytime. All plans include job posting & updates.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-8 max-w-6xl mx-auto">
        {PLANS.map((plan) => (
          <div
            key={plan.tier}
            className={`rounded-[15px] border-2 px-4 py-5 sm:px-6 sm:py-8 relative ${
              plan.badgeColor === 'orange'
                ? 'border-orange-500 bg-orange-50'
                : plan.badge
                  ? 'border-accent-blue bg-blue-50'
                  : 'border-card-border bg-card-bg'
            }`}
          >
            {plan.badge && (
              <div className={`absolute -top-3 left-1/2 -translate-x-1/2 text-white text-[10px] sm:text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap ${
                plan.badgeColor === 'orange' ? 'bg-orange-500' : 'bg-accent-blue'
              }`}>
                {plan.badge}
              </div>
            )}

            <h3 className="text-xl sm:text-2xl font-bold mb-2">{plan.name}</h3>
            <div className="mb-3 sm:mb-4">
              <span className="text-3xl sm:text-4xl font-bold">{plan.price}</span>
              <span className="text-text-muted text-sm">/month</span>
            </div>
            <p className="text-xs sm:text-sm text-text-muted mb-4 sm:mb-6">{plan.description}</p>

            <ul className="space-y-2.5 sm:space-y-3 mb-6 sm:mb-8">
              {plan.features.map((feature) => (
                <li key={feature} className="text-xs sm:text-sm flex items-start gap-2">
                  <span className={`font-bold mt-0.5 ${plan.badgeColor === 'orange' ? 'text-orange-500' : 'text-accent-blue'}`}>✓</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleCheckout(plan.tier)}
              disabled={loading === plan.tier}
              className={`w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed ${
                plan.badgeColor === 'orange' ? 'bg-orange-500 hover:bg-orange-600' : plan.badge ? 'bg-accent-blue' : ''
              }`}
            >
              {loading === plan.tier ? 'Loading...' : 'Get Started'}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-6 md:mt-12 text-center text-sm text-text-muted space-y-2">
        <p>Already have an account? <Link href="/school/login" className="text-accent-blue hover:underline">Log In</Link></p>
        <p>Need help? <Link href="/contact" className="text-accent-blue hover:underline">Contact us</Link></p>
      </div>
    </div>
  )
}

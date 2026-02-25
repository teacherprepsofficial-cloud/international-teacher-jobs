import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-04-10',
})

export const STRIPE_PRICE_IDS = {
  basic: process.env.STRIPE_BASIC_PRICE_ID || '',
  standard: process.env.STRIPE_STANDARD_PRICE_ID || '',
  premium: process.env.STRIPE_PREMIUM_PRICE_ID || '',
}

export default stripe

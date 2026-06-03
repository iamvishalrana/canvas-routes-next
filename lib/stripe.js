import Stripe from 'stripe'

if (!globalThis._stripe && process.env.STRIPE_SECRET_KEY) {
  globalThis._stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-05-28.basil',
    appInfo: { name: 'Canvas Routes', version: '1.0.0' },
  })
}

export const stripe = globalThis._stripe ?? null

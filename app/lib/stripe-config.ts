
// Stripe configuration and utilities

import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('STRIPE_SECRET_KEY not configured. Payment features will be disabled.');
}

export const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-09-30.clover',
      typescript: true,
    })
  : null;

// Subscription pricing (update these with your actual Stripe price IDs)
export const SUBSCRIPTION_PRICES = {
  BASIC_MONTHLY: process.env.STRIPE_BASIC_PRICE_ID || 'price_basic_monthly',
  PRO_MONTHLY: process.env.STRIPE_PRO_PRICE_ID || 'price_pro_monthly',
};

export const SUBSCRIPTION_FEATURES = {
  FREE: {
    name: 'Free',
    listings: Infinity,              // Unlimited
    premiumPosts: 4,                 // 4 free premium posts
    aiAnalysis: true,
    marketResearch: true,
    platformRecommendations: true,
    priceEstimation: true,
    profitCalculator: true,
    costTracking: true,
  },
  BASIC: {
    name: 'Basic',
    price: 9.99,
    listings: Infinity,
    premiumPosts: 20,                // 20 premium posts per month
    aiAnalysis: true,
    marketResearch: true,
    platformRecommendations: true,
    priceEstimation: true,
    profitCalculator: true,
    costTracking: true,
    priority: true,
  },
  PRO: {
    name: 'Pro',
    price: 19.99,
    listings: Infinity,
    premiumPosts: Infinity,          // Unlimited premium posts
    aiAnalysis: true,
    marketResearch: true,
    platformRecommendations: true,
    priceEstimation: true,
    profitCalculator: true,
    costTracking: true,
    priority: true,
    apiAccess: true,                 // API access for power users
    bulkUpload: true,
  },
};

/**
 * Create a Stripe checkout session for subscription
 */
export async function createCheckoutSession(
  userId: string,
  email: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string
): Promise<Stripe.Checkout.Session | null> {
  if (!stripe) {
    console.error('Stripe not configured');
    return null;
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId,
      },
    });

    return session;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return null;
  }
}

/**
 * Create a Stripe customer portal session
 */
export async function createPortalSession(
  customerId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session | null> {
  if (!stripe) {
    console.error('Stripe not configured');
    return null;
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return session;
  } catch (error) {
    console.error('Error creating portal session:', error);
    return null;
  }
}

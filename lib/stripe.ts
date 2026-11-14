import Stripe from "stripe";

/** Server only. The key is a Stripe test-mode secret (sk_test_…) and never reaches the browser. */

export const stripeConfigured = (): boolean => Boolean(process.env.STRIPE_SECRET_KEY);

/** The Stripe client, or null when no key is set (local dev without Stripe). */
export function stripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  return key ? new Stripe(key) : null;
}

import Stripe from "stripe";

let stripeClient: Stripe | null = null;

// Returns null (instead of throwing) when STRIPE_SECRET_KEY isn't set, so the
// rest of the app can render normally in a fresh checkout with no keys
// configured yet and show a friendly message instead of crashing.
export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!stripeClient) {
    stripeClient = new Stripe(key);
  }
  return stripeClient;
}

export function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

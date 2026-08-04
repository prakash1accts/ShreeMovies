import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { markBookingPaid } from "@/lib/data";
import type Stripe from "stripe";

// Stripe requires the raw request body to verify webhook signatures.
export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !webhookSecret) {
    return NextResponse.json(
      { error: "Stripe is not configured on this server." },
      { status: 400 }
    );
  }

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  let event: Stripe.Event;
  try {
    if (!signature) throw new Error("Missing signature");
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${(err as Error).message}` },
      { status: 400 }
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const bookingId = session.metadata?.bookingId;
    if (bookingId) {
      await markBookingPaid(bookingId, session.id);
    }
  }

  return NextResponse.json({ received: true });
}

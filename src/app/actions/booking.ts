"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getSession } from "@/lib/auth";
import {
  cancelBooking,
  createPendingBooking,
  getSeatsByIds,
  getShowtime,
  markBookingPaid,
} from "@/lib/data";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

export async function bookSeatsAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  const session = await getSession();
  if (!session) {
    redirect("/login?next=" + encodeURIComponent(String(formData.get("returnTo") || "/")));
  }

  const showtimeId = String(formData.get("showtimeId") || "");
  const seatIds = formData.getAll("seatIds").map(String).filter(Boolean);

  if (!showtimeId || seatIds.length === 0) {
    return { error: "Please select at least one seat." };
  }

  const showtime = await getShowtime(showtimeId);
  if (!showtime) {
    return { error: "This showtime no longer exists." };
  }

  const seats = await getSeatsByIds(seatIds);
  if (seats.some((s) => s.status !== "available")) {
    return { error: "One or more selected seats were just taken. Please pick again." };
  }

  const totalCents = seats.length * showtime.price_cents;

  let booking;
  try {
    booking = await createPendingBooking({
      userId: session.id,
      showtimeId,
      seatIds,
      totalCents,
    });
  } catch {
    return { error: "One or more selected seats were just taken. Please pick again." };
  }

  const stripe = getStripe();
  const hdrs = await headers();
  const origin =
    process.env.APP_URL ||
    `${hdrs.get("x-forwarded-proto") || "http"}://${hdrs.get("host")}`;

  if (!stripe || !isStripeConfigured()) {
    // No Stripe keys configured yet: skip real payment so the app is fully
    // demo-able out of the box. Booking is marked paid immediately.
    await markBookingPaid(booking.id);
    redirect(`/booking/success?booking=${booking.id}&demo=1`);
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: showtime.price_cents,
          product_data: {
            name: `${showtime.movie_title} — ${new Date(
              showtime.starts_at
            ).toLocaleString()}`,
            description: `Seats: ${seats
              .map((s) => `${s.row_label}${s.col_number}`)
              .join(", ")}`,
          },
        },
        quantity: seats.length,
      },
    ],
    success_url: `${origin}/booking/success?booking=${booking.id}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/booking/cancel?booking=${booking.id}`,
    metadata: { bookingId: booking.id },
  });

  if (!checkoutSession.url) {
    await cancelBooking(booking.id);
    return { error: "Could not start checkout. Please try again." };
  }

  redirect(checkoutSession.url);
}

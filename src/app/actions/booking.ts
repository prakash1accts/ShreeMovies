"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getSession } from "@/lib/auth";
import {
  cancelBooking,
  createPendingBooking,
  getSeatsByIds,
  getShowtime,
  getUserById,
} from "@/lib/data";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { formatVenueDateTime } from "@/lib/timezone";

export async function bookSeatsAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  const session = await getSession();
  if (!session) {
    redirect("/login?next=" + encodeURIComponent(String(formData.get("returnTo") || "/")));
  }

  // Sessions are self-contained JWTs with no server-side revocation, so a
  // customer blocked after they logged in would otherwise keep booking —
  // re-check their live status here rather than trusting the session alone.
  const currentUser = await getUserById(session.id);
  if (currentUser?.is_blocked) {
    return { error: "This account has been blocked. Please contact the theatre for help." };
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
    // No payment gateway connected yet: the booking stays 'pending' and the
    // seats stay 'held' — NOT a final booking. An admin confirms the
    // payment manually (once received in person / by transfer) from the
    // admin Bookings page, which is what finalizes it to 'paid'.
    redirect(`/booking/success?booking=${booking.id}&pending=1`);
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
            name: `${showtime.movie_title} — ${formatVenueDateTime(showtime.starts_at)}`,
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

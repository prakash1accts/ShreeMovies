import Link from "next/link";
import { getBooking, getShowtime, markBookingPaid } from "@/lib/data";
import { getStripe } from "@/lib/stripe";

export default async function BookingSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ booking?: string; session_id?: string; demo?: string }>;
}) {
  const { booking: bookingId, session_id: stripeSessionId, demo } = await searchParams;

  let booking = bookingId ? await getBooking(bookingId) : undefined;

  // In local/dev setups without a Stripe webhook forwarded, verify the
  // Checkout Session directly so the booking still gets marked paid.
  if (booking && booking.status === "pending" && stripeSessionId) {
    const stripe = getStripe();
    if (stripe) {
      try {
        const checkoutSession = await stripe.checkout.sessions.retrieve(stripeSessionId);
        if (checkoutSession.payment_status === "paid") {
          await markBookingPaid(booking.id, stripeSessionId);
          booking = await getBooking(booking.id);
        }
      } catch {
        // ignore — webhook may handle it shortly
      }
    }
  }

  const showtime = booking ? await getShowtime(booking.showtime_id) : undefined;

  return (
    <div className="mx-auto max-w-md text-center">
      <div className="text-4xl">🎟️</div>
      <h1 className="mt-4 text-2xl font-bold">Booking confirmed!</h1>
      {demo && (
        <p className="mt-2 text-sm text-yellow-400">
          Demo mode: no payment was actually charged (Stripe keys aren&apos;t configured yet).
        </p>
      )}
      {booking && showtime ? (
        <div className="mt-6 rounded-lg border border-neutral-800 bg-neutral-900 p-5 text-left">
          <div className="font-semibold">{showtime.movie_title}</div>
          <div className="text-sm text-neutral-400">
            {new Date(showtime.starts_at).toLocaleString()}
          </div>
          <div className="mt-2 text-sm text-neutral-400">
            Status: <span className="text-green-400">{booking.status}</span>
          </div>
          <div className="text-sm text-neutral-400">
            Total: ${(booking.total_cents / 100).toFixed(2)}
          </div>
        </div>
      ) : (
        <p className="mt-4 text-neutral-400">We couldn&apos;t find that booking.</p>
      )}
      <Link
        href="/account"
        className="mt-6 inline-block rounded-md bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-500"
      >
        View my bookings
      </Link>
    </div>
  );
}

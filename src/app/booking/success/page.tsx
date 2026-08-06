import Link from "next/link";
import { getBooking, getShowtime, markBookingPaid } from "@/lib/data";
import { getStripe } from "@/lib/stripe";

export default async function BookingSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ booking?: string; session_id?: string; pending?: string }>;
}) {
  const { booking: bookingId, session_id: stripeSessionId } = await searchParams;

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
  const isPending = booking?.status === "pending";

  return (
    <div className="mx-auto max-w-md text-center">
      <div className="text-4xl">{isPending ? "⏳" : "🎟️"}</div>
      <h1 className="mt-4 text-2xl font-bold">
        {isPending ? "Seats held — payment pending" : "Booking confirmed!"}
      </h1>

      {isPending && (
        <p className="mt-2 text-sm text-yellow-400">
          Your seats are held for you, but this booking is <strong>not final</strong> until the
          theatre confirms your payment. Please complete your payment soon (contact the theatre —
          see the Contact page) and let them know it&apos;s done. Once confirmed, this will switch
          to a final Paid booking with your seat numbers locked in — check back here or on{" "}
          <Link href="/account" className="underline">
            My Bookings
          </Link>
          .
        </p>
      )}

      {booking && showtime ? (
        <div className="mt-6 rounded-lg border border-neutral-800 bg-neutral-900 p-5 text-left">
          <div className="font-semibold">{showtime.movie_title}</div>
          <div className="text-sm text-neutral-400">
            {new Date(showtime.starts_at).toLocaleString()}
          </div>
          <div className="mt-2 text-sm text-neutral-400">
            Status:{" "}
            <span className={isPending ? "text-yellow-400" : "text-green-400"}>
              {booking.status}
            </span>
          </div>
          <div className="text-sm text-neutral-400">
            Total: ${(booking.total_cents / 100).toFixed(2)}
          </div>
          <div className="mt-2 text-xs text-neutral-500">Booking reference: {booking.id}</div>
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

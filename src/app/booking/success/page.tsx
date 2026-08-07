import Link from "next/link";
import { getBooking, getShowtime, markBookingPaid } from "@/lib/data";
import { getStripe } from "@/lib/stripe";
import { BANK_ACCOUNT } from "@/lib/payment-info";

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
          await markBookingPaid(booking.id, { stripeSessionId });
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
        <div className="mt-4 rounded-lg border border-yellow-800 bg-yellow-950/30 p-4 text-left">
          <p className="text-sm text-yellow-200/90">
            Your seats are held for you, but this booking is <strong>not final</strong> until we
            confirm your payment. Please transfer the total amount to the bank account below, then
            send us the deposit slip / reference so we can confirm it. Once confirmed, this will
            switch to a final Paid booking with your seat numbers locked in — check back here or on{" "}
            <Link href="/account" className="underline">
              My Bookings
            </Link>
            .
          </p>
          <div className="mt-3 space-y-1 rounded-md border border-yellow-900/60 bg-black/20 p-3 text-sm">
            <div className="font-semibold text-yellow-100">Bank transfer details</div>
            <div className="text-neutral-300">Bank: {BANK_ACCOUNT.bankName}</div>
            <div className="text-neutral-300">Account name: {BANK_ACCOUNT.accountName}</div>
            <div className="text-neutral-300">Account number: {BANK_ACCOUNT.accountNumber}</div>
            <div className="text-neutral-300">IBAN: {BANK_ACCOUNT.iban}</div>
            <div className="text-neutral-300">SWIFT/BIC: {BANK_ACCOUNT.swift}</div>
          </div>
          <p className="mt-3 text-sm text-yellow-200/90">
            Send your deposit slip via WhatsApp{" "}
            
              href={`https://wa.me/${BANK_ACCOUNT.whatsapp.replace(/[^0-9]/g, "")}`}
              className="underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {BANK_ACCOUNT.whatsapp}
            </a>{" "}
            or email{" "}
            <a href={`mailto:${BANK_ACCOUNT.email}`} className="underline">
              {BANK_ACCOUNT.email}
            </a>
            .
          </p>
        </div>
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
            Total: AOA {(booking.total_cents / 100).toFixed(2)}
          </div>
          {booking.booking_number ? (
            <div className="mt-2 text-xs text-neutral-500">
              Booking reference: {booking.booking_number}
            </div>
          ) : (
            <div className="mt-2 text-xs text-neutral-500">
              Booking ID: {booking.id} (your booking reference number is assigned once payment is
              confirmed)
            </div>
          )}
        </div>
      ) : (
        <p className="mt-4 text-neutral-400">We couldn&apos;t find that booking.</p>
      )}
      <Link
       <a href="/account"
        className="mt-6 inline-block rounded-md bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-500"
      >
        View my bookings
      </Link>
    </div>
  );
}

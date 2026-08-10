import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getBookingByReference, getShowtime } from "@/lib/data";

// Staff-facing ticket verification screen, reached by scanning the QR code
// printed on a customer's ticket. Deliberately NOT under /admin (which
// hardcodes its own login redirect target) so a logged-out staff member who
// scans a ticket gets sent to /login?next=/verify/<ref> and lands right back
// here — on that exact booking — after logging in, instead of the generic
// dashboard. Requires an admin/staff session either way, so photographing
// someone else's ticket doesn't expose their booking details to a stranger.
export default async function VerifyTicketPage({
  params,
}: {
  params: Promise<{ ref: string }>;
}) {
  const { ref } = await params;

  const session = await getSession();
  if (!session) redirect(`/login?next=/verify/${ref}`);
  if (session.role !== "admin") redirect("/");

  const booking = await getBookingByReference(ref);
  const showtime = booking ? await getShowtime(booking.showtime_id) : undefined;

  const status =
    booking?.status === "paid"
      ? { label: "VALID — PAID", emoji: "✅", classes: "border-green-700 bg-green-950/40 text-green-300" }
      : booking?.status === "cancelled"
      ? { label: "CANCELLED — DO NOT ADMIT", emoji: "❌", classes: "border-red-800 bg-red-950/40 text-red-300" }
      : { label: "PENDING PAYMENT — NOT YET VALID", emoji: "⏳", classes: "border-yellow-800 bg-yellow-950/40 text-yellow-300" };

  return (
    <div className="mx-auto max-w-md">
      <Link href="/admin/bookings" className="text-sm text-neutral-400 hover:text-neutral-200">
        ← Back to Bookings
      </Link>
      <h1 className="mt-2 text-2xl font-bold">Ticket Verification</h1>
      <p className="mt-1 text-sm text-neutral-400">Reference: {ref}</p>

      {!booking ? (
        <div className="mt-6 rounded-lg border border-red-800 bg-red-950/30 p-5 text-red-300">
          No booking found for this reference. Double-check the code — this ticket may not be
          valid, or may belong to a different booking.
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          <div
            className={`rounded-lg border p-4 text-center text-lg font-bold ${status.classes}`}
          >
            {status.emoji} {status.label}
          </div>

          <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-5">
            <div className="text-lg font-semibold">{booking.movie_title}</div>
            {showtime && (
              <div className="mt-1 text-sm text-neutral-400">
                {new Date(showtime.starts_at).toLocaleString()} · {showtime.screen_name}
              </div>
            )}

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-neutral-500">Booking ref</div>
                <div className="font-medium">{booking.booking_number || booking.id}</div>
              </div>
              <div>
                <div className="text-neutral-500">Seats</div>
                <div className="font-medium">{booking.seat_labels || "—"}</div>
              </div>
              <div>
                <div className="text-neutral-500">Customer</div>
                <div className="font-medium">{booking.customer_name || "—"}</div>
              </div>
              <div>
                <div className="text-neutral-500">Phone</div>
                <div className="font-medium">
                  {booking.account_phone || booking.account_whatsapp || "—"}
                </div>
              </div>
              <div>
                <div className="text-neutral-500">Total</div>
                <div className="font-medium">AOA {(booking.total_cents / 100).toFixed(2)}</div>
              </div>
              <div>
                <div className="text-neutral-500">Payment</div>
                <div className="font-medium">
                  {booking.payment_terms === "deposit"
                    ? "Deposit"
                    : booking.payment_terms === "cash"
                    ? "Cash"
                    : "Online"}
                </div>
              </div>
            </div>

            {booking.seats_changed_note && (
              <div className="mt-4 rounded-md border border-amber-800 bg-amber-950/30 p-3 text-xs text-amber-300">
                ⚠ {booking.seats_changed_note}
              </div>
            )}
          </div>

          <Link
            href="/admin/bookings"
            className="block rounded-md bg-neutral-800 px-4 py-2 text-center text-sm text-neutral-200 hover:bg-neutral-700"
          >
            View in admin bookings
          </Link>
        </div>
      )}
    </div>
  );
}

import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getBooking,
  getBookingSeatIds,
  getShowtime,
  listCustomers,
  listSeatsForShowtime,
} from "@/lib/data";
import { linkBookingToUserAction } from "@/app/actions/admin";
import EditBookingForm from "@/components/EditBookingForm";
import { formatVenueDateTime } from "@/lib/timezone";
import type { Booking, User } from "@/lib/types";

export default async function EditBookingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const booking = await getBooking(id);
  if (!booking) notFound();

  const showtime = await getShowtime(booking.showtime_id);
  if (!showtime) notFound();

  // Only needed to populate the "link to a customer account" picker, and
  // only ever shown for bookings that don't have one yet — but cheap enough
  // to just always fetch rather than branching the query.
  const [seats, currentSeatIds, customers] = await Promise.all([
    listSeatsForShowtime(booking.showtime_id),
    getBookingSeatIds(booking.id),
    listCustomers(),
  ]);

  // deposit_date is a Postgres DATE column — pg returns those as a Date
  // object, not the plain string the Booking type claims, so it's coerced
  // into a "YYYY-MM-DD" string here (safe for either shape) before handing
  // it to the client form as a date-input default.
  const rawDepositDate = booking.deposit_date as unknown;
  const initialDepositDate = !rawDepositDate
    ? ""
    : rawDepositDate instanceof Date
    ? rawDepositDate.toISOString().slice(0, 10)
    : String(rawDepositDate).slice(0, 10);

  return (
    <div>
      <Link href="/admin/bookings" className="text-sm text-neutral-400 hover:text-neutral-200">
        ← Back to Bookings
      </Link>
      <h1 className="mt-2 text-2xl font-bold">Edit Booking</h1>
      <p className="mt-1 text-neutral-400">
        {showtime.movie_title} · {formatVenueDateTime(showtime.starts_at)} ·{" "}
        {booking.customer_name || "Online booking"}
      </p>

      <div className="mt-6 space-y-6">
        <EditBookingForm
          booking={booking}
          seats={seats}
          currentSeatIds={currentSeatIds}
          initialDepositDate={initialDepositDate}
        />
        {!booking.user_id && <LinkToAccount booking={booking} customers={customers} />}
      </div>
    </div>
  );
}

// Lets an admin attach a walk-in/admin-entered booking (no user_id) to an
// existing registered customer account, so it starts showing up on that
// customer's own "My Bookings" page — e.g. after a screen change forced an
// online customer's booking to be recreated as a walk-in sale (see
// linkBookingToUserAction's comment in actions/admin.ts).
function LinkToAccount({
  booking,
  customers,
}: {
  booking: Booking;
  customers: User[];
}) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-5">
      <h2 className="font-semibold">Link to a customer account</h2>
      <p className="mt-1 text-sm text-neutral-400">
        This booking isn&apos;t attached to a registered account yet, so it only shows up here —
        not on the customer&apos;s own &quot;My Bookings&quot; page. Attach it to their account
        below if they have one.
      </p>
      {customers.length === 0 ? (
        <p className="mt-3 text-sm text-neutral-500">No registered customer accounts yet.</p>
      ) : (
        <form action={linkBookingToUserAction} className="mt-3 flex flex-wrap items-center gap-2">
          <input type="hidden" name="bookingId" value={booking.id} />
          <select
            name="userId"
            required
            className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-red-500"
          >
            <option value="">Choose a customer…</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.email}
                {c.phone ? ` — ${c.phone}` : ""}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-md bg-neutral-800 px-3 py-1.5 text-sm text-neutral-200 hover:bg-neutral-700"
          >
            Link booking
          </button>
        </form>
      )}
    </div>
  );
}

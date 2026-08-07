import Link from "next/link";
import { listAllBookings } from "@/lib/data";
import { confirmBookingPaymentAction, cancelBookingAction } from "@/app/actions/admin";
import TicketButton from "@/components/TicketButton";

export default async function AdminBookingsPage() {
  const bookings = await listAllBookings();
  const pending = bookings.filter((b) => b.status === "pending");

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Bookings</h1>
        <Link
          href="/admin/bookings/new"
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500"
        >
          + New Booking
        </Link>
      </div>

      {pending.length > 0 && (
        <div className="mt-6 rounded-lg border border-yellow-800 bg-yellow-950/30 p-4">
          <h2 className="font-semibold text-yellow-300">
            Pending Payment Confirmation ({pending.length})
          </h2>
          <p className="mt-1 text-sm text-yellow-200/70">
            These customers checked out online and have their seats held, but payment hasn&apos;t
            been confirmed yet. Confirm once you&apos;ve received payment, or cancel to release
            the seats back to the pool.
          </p>
          <div className="mt-3 space-y-2">
            {pending.map((b) => (
              <div
                key={b.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-neutral-800 bg-neutral-900 p-3 text-sm"
              >
                <div>
                  <div className="font-medium">{b.movie_title}</div>
                  <div className="text-neutral-400">
                    {new Date(b.starts_at).toLocaleString()} · Seats: {b.seat_labels || "—"} · AOA{" "}
                    {(b.total_cents / 100).toFixed(2)}
                  </div>
                </div>
                <div className="flex flex-wrap items-end gap-2">
                  <form
                    action={confirmBookingPaymentAction}
                    className="flex flex-wrap items-end gap-2"
                  >
                    <input type="hidden" name="id" value={b.id} />
                    <label className="text-xs text-neutral-400">
                      Deposit ref.
                      <input
                        type="text"
                        name="depositReference"
                        className="mt-0.5 block w-32 rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1 text-xs text-neutral-200"
                      />
                    </label>
                    <label className="text-xs text-neutral-400">
                      Deposit date
                      <input
                        type="date"
                        name="depositDate"
                        className="mt-0.5 block rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1 text-xs text-neutral-200"
                      />
                    </label>
                    <label className="text-xs text-neutral-400">
                      Proof
                      <input
                        type="file"
                        name="paymentProof"
                        accept="image/*,.pdf"
                        className="mt-0.5 block w-36 text-xs text-neutral-400 file:mr-2 file:rounded file:border-0 file:bg-neutral-700 file:px-2 file:py-1 file:text-xs file:text-neutral-200"
                      />
                    </label>
                    <button className="rounded-md bg-green-700 px-3 py-1.5 text-white hover:bg-green-600">
                      Confirm Payment
                    </button>
                  </form>
                  <form action={cancelBookingAction}>
                    <input type="hidden" name="id" value={b.id} />
                    <button className="rounded-md bg-neutral-800 px-3 py-1.5 text-neutral-300 hover:bg-red-900 hover:text-red-300">
                      Cancel
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 overflow-x-auto rounded-lg border border-neutral-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-900 text-neutral-400">
            <tr>
              <th className="px-4 py-3">Movie</th>
              <th className="px-4 py-3">Showtime</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Seats</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Booked</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id} className="border-t border-neutral-800">
                <td className="px-4 py-3">{b.movie_title}</td>
                <td className="px-4 py-3 text-neutral-400">
                  {new Date(b.starts_at).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-neutral-400">
                  {b.customer_name || "—"}
                  {b.created_by_admin && (
                    <span className="ml-1.5 rounded-full bg-neutral-800 px-1.5 py-0.5 text-[10px] text-neutral-400">
                      walk-in
                    </span>
                  )}
                  {(b.account_phone || b.account_whatsapp) && (
                    <div className="mt-0.5 text-xs text-neutral-500">
                      {b.account_phone && `Tel: ${b.account_phone}`}
                      {b.account_phone && b.account_whatsapp && " · "}
                      {b.account_whatsapp && `WhatsApp: ${b.account_whatsapp}`}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-neutral-400">
                  {b.seat_labels || "—"}
                  {b.seats_changed_note && (
                    <div className="mt-0.5 text-xs text-amber-400">⚠ seats changed</div>
                  )}
                </td>
                <td className="px-4 py-3">AOA {(b.total_cents / 100).toFixed(2)}</td>
                <td className="px-4 py-3 text-neutral-400">
                  {b.payment_terms
                    ? b.payment_terms === "deposit"
                      ? `Deposit${b.deposit_reference ? ` (${b.deposit_reference})` : ""}`
                      : "Cash"
                    : "—"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={[
                      "rounded-full px-2 py-0.5 text-xs",
                      b.status === "paid"
                        ? "bg-green-900 text-green-300"
                        : b.status === "cancelled"
                        ? "bg-neutral-800 text-neutral-400"
                        : "bg-yellow-900 text-yellow-300",
                    ].join(" ")}
                  >
                    {b.status}
                  </span>
                  {b.booking_number && (
                    <div className="mt-0.5 text-xs text-neutral-500">#{b.booking_number}</div>
                  )}
                </td>
                <td className="px-4 py-3 text-neutral-500">
                  {new Date(b.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {b.status !== "cancelled" && (
                      <Link
                        href={`/admin/bookings/${b.id}/edit`}
                        className="rounded-md bg-neutral-800 px-2 py-1 text-xs text-neutral-300 hover:bg-neutral-700"
                      >
                        Edit
                      </Link>
                    )}
                    {b.status !== "cancelled" && (
                      <form action={cancelBookingAction}>
                        <input type="hidden" name="id" value={b.id} />
                        <button className="rounded-md bg-neutral-800 px-2 py-1 text-xs text-neutral-300 hover:bg-red-900 hover:text-red-300">
                          Cancel
                        </button>
                      </form>
                    )}
                    {b.status === "paid" && <TicketButton booking={b} />}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {bookings.length === 0 && (
          <div className="p-6 text-center text-neutral-400">No bookings yet.</div>
        )}
      </div>
    </div>
  );
}

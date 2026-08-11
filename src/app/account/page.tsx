import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getUserById, listBookingsForUser } from "@/lib/data";
import TicketButton from "@/components/TicketButton";
import { formatVenueDateTime } from "@/lib/timezone";

export default async function AccountPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/account");

  const [user, bookings] = await Promise.all([
    getUserById(session.id),
    listBookingsForUser(session.id),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold">My Bookings</h1>
      <p className="mt-1 text-neutral-400">Signed in as {session.email}</p>
      {(user?.phone || user?.whatsapp) && (
        <p className="mt-1 text-sm text-neutral-500">
          {user?.phone && `Phone: ${user.phone}`}
          {user?.phone && user?.whatsapp && " · "}
          {user?.whatsapp && `WhatsApp: ${user.whatsapp}`}
        </p>
      )}

      {bookings.length === 0 ? (
        <p className="mt-6 text-neutral-400">You haven&apos;t booked any tickets yet.</p>
      ) : (
        <div className="mt-6 space-y-4">
          {bookings.map((b) => (
            <div
              key={b.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-800 bg-neutral-900 p-4"
            >
              <div>
                <div className="font-semibold">{b.movie_title}</div>
                <div className="text-sm text-neutral-400">
                  {formatVenueDateTime(b.starts_at, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </div>
                <div className="text-sm text-neutral-500">
                  Seats: {b.seat_labels || "—"}
                </div>
                {b.booking_number && (
                  <div className="text-xs text-neutral-500">
                    Booking #{b.booking_number}
                  </div>
                )}
                {b.status === "pending" && (
                  <div className="mt-1 text-xs text-yellow-400">
                    Not final yet — awaiting payment confirmation. See the payment page for our
                    bank transfer details.
                  </div>
                )}
                {b.seats_changed_note && (
                  <div className="mt-1 text-xs text-amber-400">⚠ {b.seats_changed_note}</div>
                )}
                {b.status === "cancelled" && b.cancel_reason && (
                  <div className="mt-1 text-xs text-neutral-400">⚠ {b.cancel_reason}</div>
                )}
              </div>
              <div className="text-right">
                <div className="font-medium">AOA {(b.total_cents / 100).toFixed(2)}</div>
                <span
                  className={[
                    "mt-1 inline-block rounded-full px-2 py-0.5 text-xs",
                    b.status === "paid"
                      ? "bg-green-900 text-green-300"
                      : b.status === "cancelled"
                      ? "bg-neutral-800 text-neutral-400"
                      : "bg-yellow-900 text-yellow-300",
                  ].join(" ")}
                >
                  {b.status}
                </span>
                {b.status === "paid" && (
                  <div className="mt-2">
                    <TicketButton booking={b} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

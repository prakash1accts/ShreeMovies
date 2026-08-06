import Link from "next/link";
import { listSeatsForShowtime, listUpcomingShowtimes } from "@/lib/data";
import AdminBookingForm from "@/components/AdminBookingForm";
import type { Seat } from "@/lib/types";

export default async function NewAdminBookingPage() {
  const showtimes = await listUpcomingShowtimes();

  const seatsByShowtime: Record<string, Seat[]> = {};
  await Promise.all(
    showtimes.map(async (st) => {
      seatsByShowtime[st.id] = await listSeatsForShowtime(st.id);
    })
  );

  return (
    <div>
      <Link href="/admin/bookings" className="text-sm text-neutral-400 hover:text-neutral-200">
        ← Back to Bookings
      </Link>
      <h1 className="mt-2 text-2xl font-bold">New Booking</h1>
      <p className="mt-1 text-neutral-400">
        Record a walk-in or phone ticket sale. Choose automatic seat allocation to have the
        system seat the group together, or pick exact seats manually.
      </p>

      <div className="mt-6">
        {showtimes.length === 0 ? (
          <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-8 text-center text-neutral-400">
            No upcoming showtimes. Add one from the Showtimes tab first.
          </div>
        ) : (
          <AdminBookingForm showtimes={showtimes} seatsByShowtime={seatsByShowtime} />
        )}
      </div>
    </div>
  );
}

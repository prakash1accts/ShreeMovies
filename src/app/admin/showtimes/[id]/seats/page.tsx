import { notFound } from "next/navigation";
import Link from "next/link";
import { getAdminSeatMapForShowtime, getShowtime } from "@/lib/data";
import { formatVenueDateTime } from "@/lib/timezone";
import AdminSeatMapClient from "@/components/AdminSeatMapClient";

// Read-only visual booking layout for one showtime — the actual seat grid
// (same shape the customer sees) colored by status, with the customer name
// and booking reference on each occupied seat. This is what was missing
// from the admin portal: the Bookings table only lists bookings as text
// rows ("Seats: A3, A4"), with no way to see the whole screen at a glance —
// who's sitting where, and which seats are still open. The interactive
// portion (selecting seats to block/unblock) lives in AdminSeatMapClient;
// this stays a server component for the static header.
export default async function AdminShowtimeSeatsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [showtime, seats] = await Promise.all([
    getShowtime(id),
    getAdminSeatMapForShowtime(id),
  ]);
  if (!showtime) notFound();

  return (
    <div>
      <Link href="/admin/showtimes" className="text-sm text-neutral-400 hover:text-neutral-200">
        ← Back to Showtimes
      </Link>
      <h1 className="mt-2 text-2xl font-bold">
        {showtime.movie_title} — {showtime.screen_name}
      </h1>
      <p className="text-sm text-neutral-500">{formatVenueDateTime(showtime.starts_at)}</p>

      <div className="mt-4">
        <AdminSeatMapClient showtimeId={id} seats={seats} />
      </div>
    </div>
  );
}

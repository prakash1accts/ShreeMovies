import { notFound } from "next/navigation";
import Link from "next/link";
import { getBooking, getBookingSeatIds, getShowtime, listSeatsForShowtime } from "@/lib/data";
import EditBookingForm from "@/components/EditBookingForm";

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

  const [seats, currentSeatIds] = await Promise.all([
    listSeatsForShowtime(booking.showtime_id),
    getBookingSeatIds(booking.id),
  ]);

  return (
    <div>
      <Link href="/admin/bookings" className="text-sm text-neutral-400 hover:text-neutral-200">
        ← Back to Bookings
      </Link>
      <h1 className="mt-2 text-2xl font-bold">Edit Booking</h1>
      <p className="mt-1 text-neutral-400">
        {showtime.movie_title} · {new Date(showtime.starts_at).toLocaleString()} ·{" "}
        {booking.customer_name || "Online booking"}
      </p>

      <div className="mt-6">
        <EditBookingForm booking={booking} seats={seats} currentSeatIds={currentSeatIds} />
      </div>
    </div>
  );
}

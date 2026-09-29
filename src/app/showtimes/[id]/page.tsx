import { notFound } from "next/navigation";
import { getShowtime, listSeatsForShowtime } from "@/lib/data";
import { getSession } from "@/lib/auth";
import SeatPicker from "@/components/SeatPicker";
import { formatVenueDateTime } from "@/lib/timezone";
import { BOOKING_CONTACT_PHONE } from "@/lib/payment-info";

export default async function ShowtimePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const showtime = await getShowtime(id);
  if (!showtime) notFound();

  const seats = await listSeatsForShowtime(id);
  const session = await getSession();

  return (
    <div>
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold">{showtime.movie_title}</h1>
        <p className="mt-1 text-neutral-400">
          {formatVenueDateTime(showtime.starts_at, {
            weekday: "long",
            month: "long",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}{" "}
          · {showtime.theater_name} · {showtime.screen_name}
        </p>
        <p className="mt-1 text-sm text-neutral-500">
          AOA {(showtime.price_cents / 100).toFixed(2)} per seat
        </p>
      </div>

      {showtime.closed_at ? (
        <div className="mx-auto max-w-md rounded-lg border border-neutral-800 bg-neutral-900 p-6 text-center text-neutral-400">
          This showtime is closed and no longer accepting bookings.
        </div>
      ) : showtime.admin_only_booking && session?.role !== "admin" ? (
        <div className="mx-auto max-w-md rounded-lg border border-neutral-800 bg-neutral-900 p-6 text-center text-neutral-300">
          <p>Online booking isn&apos;t available for this session.</p>
          <p className="mt-2">
            Contact Shree Movies booking for this session:{" "}
            <a
              href={`https://wa.me/${BOOKING_CONTACT_PHONE.replace(/[^0-9]/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-red-400 hover:text-red-300"
            >
              {BOOKING_CONTACT_PHONE}
            </a>
          </p>
        </div>
      ) : (
        <SeatPicker
          showtimeId={showtime.id}
          seats={seats}
          priceCents={showtime.price_cents}
          holdMinutes={showtime.hold_minutes}
          isLoggedIn={Boolean(session)}
          returnTo={`/showtimes/${showtime.id}`}
        />
      )}
    </div>
  );
}

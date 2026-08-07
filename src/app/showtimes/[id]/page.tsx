import { notFound } from "next/navigation";
import { getShowtime, listSeatsForShowtime } from "@/lib/data";
import { getSession } from "@/lib/auth";
import SeatPicker from "@/components/SeatPicker";

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
          {new Date(showtime.starts_at).toLocaleString(undefined, {
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

      <SeatPicker
        showtimeId={showtime.id}
        seats={seats}
        priceCents={showtime.price_cents}
        isLoggedIn={Boolean(session)}
        returnTo={`/showtimes/${showtime.id}`}
      />
    </div>
  );
}

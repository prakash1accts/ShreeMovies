import Link from "next/link";
import { notFound } from "next/navigation";
import { getMovie, getSeatAvailabilityForShowtimes, listShowtimesForMovie } from "@/lib/data";
import { getSession } from "@/lib/auth";
import PosterImage from "@/components/PosterImage";
import { formatVenueDate, formatVenueTime } from "@/lib/timezone";

export default async function MovieDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const movie = await getMovie(id);
  const session = await getSession();
  const isAdmin = session?.role === "admin";
  // Archived movies are hidden from customers, same as if they didn't exist
  // — but an admin can still open the page directly (e.g. to unarchive it).
  if (!movie || (movie.archived_at && !isAdmin)) notFound();

  const showtimes = await listShowtimesForMovie(id);

  // A showtime reads as "Sold out" instead of a bookable "Book ticket"
  // button once it has zero seats left with status 'available' — e.g.
  // today's and tomorrow's fully-booked Drishyam shows — while a showtime
  // that still has open seats (like next week's) keeps the normal button.
  const availability = await getSeatAvailabilityForShowtimes(showtimes.map((st) => st.id));

  // Group showtimes by calendar day for a cleaner layout
  const byDay = new Map<string, typeof showtimes>();
  for (const st of showtimes) {
    const day = formatVenueDate(st.starts_at, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day)!.push(st);
  }

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
      <div className="md:col-span-1">
        <div className="aspect-[2/3] w-full overflow-hidden rounded-lg bg-neutral-800">
          <PosterImage
            src={movie.poster_url}
            alt={movie.title}
            className="h-full w-full object-cover"
          />
        </div>
      </div>

      <div className="md:col-span-2">
        <h1 className="text-3xl font-bold">{movie.title}</h1>
        <p className="mt-1 text-neutral-400">
          {[
            movie.duration_minutes ? `${movie.duration_minutes} min` : null,
            movie.genre,
            movie.rating,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>

        {movie.language && (
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1 text-xs text-neutral-300">
              {movie.language}
            </span>
          </div>
        )}

        {showtimes.length > 0 && (
          
            <a href="#showtimes"
            className="mt-5 inline-block rounded-md border border-red-600 px-5 py-2 text-sm font-medium text-red-500 transition hover:bg-red-600 hover:text-white"
          >
            Book tickets
          </a>
        )}

        {movie.description && (
          <>
            <hr className="mt-6 border-neutral-800" />
            <h2 className="mt-6 text-lg font-semibold">About the movie</h2>
            <p className="mt-2 leading-relaxed text-neutral-300">{movie.description}</p>
          </>
        )}

        <h2 id="showtimes" className="mt-8 text-xl font-semibold">
          Showtimes
        </h2>
        {showtimes.length === 0 ? (
          <p className="mt-2 text-neutral-400">No showtimes scheduled yet.</p>
        ) : (
          <div className="mt-4 space-y-6">
            {Array.from(byDay.entries()).map(([day, times]) => (
              <div key={day}>
                <div className="mb-2 text-sm font-medium text-neutral-400">{day}</div>
                <div className="flex flex-wrap gap-2">
                  {times.map((st) => (
                    // The time/screen label is plain text now, not a link —
                    // only the "Book ticket" button is clickable, so there's
                    // no ambiguity about where to tap to actually book.
                    <div
                      key={st.id}
                      className="flex items-center gap-3 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
                    >
                      <span>
                        {formatVenueTime(st.starts_at, {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                        <span className="ml-2 text-neutral-500">{st.screen_name}</span>
                      </span>
                      {(() => {
                        const seats = availability[st.id];
                        const soldOut = Boolean(seats && seats.total > 0 && seats.available === 0);

                        // Genuinely no seats left — there's nothing to pick on
                        // the seat picker regardless of who's looking, so this
                        // takes priority over the admin-only-booking case too.
                        if (soldOut) {
                          return (
                            <span
                              className="cursor-not-allowed rounded-md bg-neutral-800 px-3 py-1.5 text-xs font-semibold text-neutral-500"
                              title="No seats left for this showtime"
                            >
                              Sold out
                            </span>
                          );
                        }

                        if (st.admin_only_booking && !isAdmin) {
                          return (
                            <Link
                              href={`/showtimes/${st.id}`}
                              className="rounded-md border border-neutral-700 px-3 py-1.5 text-xs font-semibold text-neutral-300 transition hover:border-neutral-500"
                            >
                              Contact to book
                            </Link>
                          );
                        }

                        return (
                          <Link
                            href={`/showtimes/${st.id}`}
                            className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-500"
                          >
                            Book ticket
                          </Link>
                        );
                      })()}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

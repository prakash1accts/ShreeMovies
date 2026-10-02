"use client";

import { useRouter } from "next/navigation";
import type { ShowtimeWithMovie } from "@/lib/data";
import { formatVenueDateTime } from "@/lib/timezone";

// A GET-style filter: picking an option here navigates to the same Bookings
// page with ?movieId=<id> or ?showtimeId=<id> appended (or neither, for "All
// movies"), so the filtered list is a real URL an admin can bookmark or
// share — not just client-side state that resets on refresh.
//
// Showtimes are grouped under their movie (via <optgroup>) so a title with
// several sessions — e.g. Drishyam playing both Saturday and Sunday — can be
// filtered down to one specific show, not just the movie as a whole.
export default function BookingsMovieFilter({
  showtimes,
  selectedMovieId,
  selectedShowtimeId,
}: {
  showtimes: ShowtimeWithMovie[];
  selectedMovieId?: string;
  selectedShowtimeId?: string;
}) {
  const router = useRouter();

  // Group showtimes by movie, preserving the order they were given in
  // (listActiveShowtimes sorts by starts_at ASC, so each group's sessions
  // already read in chronological order too).
  const byMovie = new Map<string, { title: string; showtimes: ShowtimeWithMovie[] }>();
  for (const st of showtimes) {
    if (!byMovie.has(st.movie_id)) {
      byMovie.set(st.movie_id, { title: st.movie_title, showtimes: [] });
    }
    byMovie.get(st.movie_id)!.showtimes.push(st);
  }

  const currentValue = selectedShowtimeId
    ? `show:${selectedShowtimeId}`
    : selectedMovieId
    ? `movie:${selectedMovieId}`
    : "";

  return (
    <label className="flex items-center gap-2 text-sm text-neutral-300">
      Movie
      <select
        value={currentValue}
        onChange={(e) => {
          const value = e.target.value;
          if (!value) {
            router.push("/admin/bookings");
          } else {
            const [kind, id] = value.split(":");
            const param = kind === "show" ? "showtimeId" : "movieId";
            router.push(`/admin/bookings?${param}=${id}`);
          }
        }}
        className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-sm text-neutral-200 outline-none focus:border-red-500"
      >
        <option value="">All movies</option>
        {Array.from(byMovie.entries()).map(([movieId, group]) => (
          <optgroup key={movieId} label={group.title}>
            <option value={`movie:${movieId}`}>All {group.title} shows</option>
            {group.showtimes.map((st) => (
              <option key={st.id} value={`show:${st.id}`}>
                {formatVenueDateTime(st.starts_at)} · {st.screen_name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  );
}

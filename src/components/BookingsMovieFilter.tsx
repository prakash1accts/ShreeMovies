"use client";

import { useRouter } from "next/navigation";
import type { Movie } from "@/lib/types";

// A GET-style filter: picking a movie here navigates to the same Bookings
// page with ?movieId=<id> appended (or removed, for "All movies"), so the
// filtered list is a real URL an admin can bookmark or share — not just
// client-side state that resets on refresh.
export default function BookingsMovieFilter({
  movies,
  selectedMovieId,
}: {
  movies: Movie[];
  selectedMovieId?: string;
}) {
  const router = useRouter();

  return (
    <label className="flex items-center gap-2 text-sm text-neutral-300">
      Movie
      <select
        value={selectedMovieId || ""}
        onChange={(e) => {
          const value = e.target.value;
          router.push(value ? `/admin/bookings?movieId=${value}` : "/admin/bookings");
        }}
        className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-sm text-neutral-200 outline-none focus:border-red-500"
      >
        <option value="">All movies</option>
        {movies.map((m) => (
          <option key={m.id} value={m.id}>
            {m.title}
            {m.archived_at ? " (archived)" : ""}
          </option>
        ))}
      </select>
    </label>
  );
}

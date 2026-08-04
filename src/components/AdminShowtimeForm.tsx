"use client";

import { useActionState } from "react";
import { createShowtimeAction } from "@/app/actions/admin";
import type { Movie, Screen } from "@/lib/types";

export default function AdminShowtimeForm({
  movies,
  screens,
}: {
  movies: Movie[];
  screens: Screen[];
}) {
  const [state, formAction, isPending] = useActionState(createShowtimeAction, undefined);

  return (
    <form
      action={formAction}
      className="grid grid-cols-1 gap-3 rounded-lg border border-neutral-800 bg-neutral-900 p-5 sm:grid-cols-2"
    >
      <div>
        <label className="mb-1 block text-sm text-neutral-300">Movie</label>
        <select
          name="movieId"
          required
          className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-red-500"
        >
          {movies.map((m) => (
            <option key={m.id} value={m.id}>
              {m.title}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm text-neutral-300">Screen</label>
        <select
          name="screenId"
          required
          className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-red-500"
        >
          {screens.map((s) => {
            const seatCount = s.layout_json
              ? s.layout_json.rows.reduce((sum, r) => sum + r.seatNumbers.length, 0)
              : s.rows * s.cols;
            return (
              <option key={s.id} value={s.id}>
                {s.name} ({seatCount} seats{s.layout_json ? ", real layout" : ""})
              </option>
            );
          })}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm text-neutral-300">Date</label>
        <input
          type="date"
          name="date"
          required
          className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-red-500"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm text-neutral-300">Time</label>
        <input
          type="time"
          name="time"
          required
          className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-red-500"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm text-neutral-300">Price (USD)</label>
        <input
          type="number"
          step="0.01"
          name="price"
          defaultValue={12}
          className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-red-500"
        />
      </div>

      {state?.error && (
        <p className="sm:col-span-2 text-sm text-red-400">{state.error}</p>
      )}
      {movies.length === 0 && (
        <p className="sm:col-span-2 text-sm text-yellow-400">
          Add a movie first before scheduling showtimes.
        </p>
      )}

      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={isPending || movies.length === 0}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50"
        >
          {isPending ? "Scheduling…" : "Add showtime"}
        </button>
      </div>
    </form>
  );
}

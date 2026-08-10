"use client";

import { useActionState } from "react";
import { createShowtimeAction, updateShowtimeAction } from "@/app/actions/admin";
import type { Movie, Screen, Showtime } from "@/lib/types";
import { splitVenueDateTime } from "@/lib/timezone";

export default function AdminShowtimeForm({
  movies,
  screens,
  showtime,
}: {
  movies: Movie[];
  screens: Screen[];
  showtime?: Showtime;
}) {
  const isEdit = Boolean(showtime);
  const [state, formAction, isPending] = useActionState(
    isEdit ? updateShowtimeAction : createShowtimeAction,
    undefined
  );
  const { date: defaultDate, time: defaultTime } = showtime
    ? splitVenueDateTime(showtime.starts_at)
    : { date: undefined, time: undefined };

  return (
    <form
      action={formAction}
      className="grid grid-cols-1 gap-3 rounded-lg border border-neutral-800 bg-neutral-900 p-5 sm:grid-cols-2"
    >
      {isEdit && <input type="hidden" name="id" value={showtime!.id} />}
      <div>
        <label className="mb-1 block text-sm text-neutral-300">Movie</label>
        <select
          name="movieId"
          required
          defaultValue={showtime?.movie_id}
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
          defaultValue={showtime?.screen_id}
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
        {isEdit && (
          <p className="mt-1 text-xs text-neutral-500">
            Changing the screen regenerates the seat map for this showtime — only allowed while
            no seats on it are held or booked yet.
          </p>
        )}
      </div>
      <div>
        <label className="mb-1 block text-sm text-neutral-300">Date</label>
        <input
          type="date"
          name="date"
          required
          defaultValue={defaultDate}
          className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-red-500"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm text-neutral-300">Time</label>
        <input
          type="time"
          name="time"
          required
          defaultValue={defaultTime}
          className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-red-500"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm text-neutral-300">Price (AOA)</label>
        <input
          type="number"
          step="0.01"
          name="price"
          defaultValue={showtime ? showtime.price_cents / 100 : 1200}
          className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-red-500"
        />
      </div>

      {state?.error && (
        <p className="sm:col-span-2 text-sm text-red-400">{state.error}</p>
      )}
      {!isEdit && movies.length === 0 && (
        <p className="sm:col-span-2 text-sm text-yellow-400">
          Add a movie first before scheduling showtimes.
        </p>
      )}

      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={isPending || (!isEdit && movies.length === 0)}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50"
        >
          {isPending ? "Saving…" : isEdit ? "Save changes" : "Add showtime"}
        </button>
      </div>
    </form>
  );
}

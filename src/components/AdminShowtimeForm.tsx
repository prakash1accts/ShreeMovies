"use client";

import { useActionState, useState } from "react";
import { createShowtimeAction, updateShowtimeAction } from "@/app/actions/admin";
import type { Movie, Screen, Showtime } from "@/lib/types";
import { splitVenueDateTime } from "@/lib/timezone";
import { BOOKING_CONTACT_PHONE } from "@/lib/payment-info";
import { IMAX_ROW_PRICE_TIERS } from "@/lib/real-screens";

// IMAX_ROW_PRICE_TIERS is in price_cents; the Row pricing textarea is in
// whole AOA, same unit as the main Price field, so admins never have to
// think in cents.
const IMAX_TIERS_AOA = Object.fromEntries(
  Object.entries(IMAX_ROW_PRICE_TIERS).map(([label, cents]) => [label, cents / 100])
);

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

  const [screenId, setScreenId] = useState(showtime?.screen_id ?? screens[0]?.id ?? "");
  const [rowPricingText, setRowPricingText] = useState(() => {
    if (!showtime?.row_price_overrides) return "";
    const aoa = Object.fromEntries(
      Object.entries(showtime.row_price_overrides).map(([label, cents]) => [label, cents / 100])
    );
    return JSON.stringify(aoa, null, 2);
  });
  const selectedScreenName = screens.find((s) => s.id === screenId)?.name;
  const isImaxScreen = selectedScreenName === "IMAX";

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
          value={screenId}
          onChange={(e) => setScreenId(e.target.value)}
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
      <div>
        <label className="mb-1 block text-sm text-neutral-300">
          Seat hold time (minutes)
        </label>
        <input
          type="number"
          step="1"
          min={1}
          name="holdMinutes"
          defaultValue={showtime ? showtime.hold_minutes : 15}
          className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-red-500"
        />
        <p className="mt-1 text-xs text-neutral-500">
          How long a selected seat stays reserved for this showtime before it&apos;s
          automatically released back to the pool if payment isn&apos;t confirmed. Default is 15
          — raise it for high-demand showtimes so customers have more time to complete a bank
          transfer.
        </p>
      </div>
      <div className="sm:col-span-2">
        <div className="flex items-center justify-between gap-2">
          <label className="mb-1 block text-sm text-neutral-300">
            Row pricing (optional)
          </label>
          {isImaxScreen && (
            <button
              type="button"
              onClick={() => setRowPricingText(JSON.stringify(IMAX_TIERS_AOA, null, 2))}
              className="mb-1 rounded-md bg-neutral-800 px-2.5 py-1 text-xs font-medium text-neutral-200 hover:bg-neutral-700"
            >
              Fill IMAX tier pricing (R/Q/P 22000 · O–H 18000 · G–A 16000)
            </button>
          )}
        </div>
        <textarea
          name="rowPriceOverrides"
          value={rowPricingText}
          onChange={(e) => setRowPricingText(e.target.value)}
          rows={4}
          placeholder='Leave blank for one flat price. Or set different prices per row, e.g. {"R": 22000, "Q": 22000}'
          spellCheck={false}
          className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 font-mono text-xs outline-none focus:border-red-500"
        />
        <p className="mt-1 text-xs text-neutral-500">
          Optional JSON map of row letter → price in AOA (same unit as Price above). Any row left
          out uses the flat Price. Leave this blank to charge every seat the same Price.
        </p>
      </div>
      <div className="sm:col-span-2">
        <label className="flex items-start gap-2 text-sm text-neutral-300">
          <input
            type="checkbox"
            name="adminOnlyBooking"
            defaultChecked={showtime?.admin_only_booking ?? false}
            className="mt-0.5 h-4 w-4 rounded border-neutral-700 bg-neutral-950 accent-red-600"
          />
          <span>
            Admin-only booking for this session
            <span className="mt-0.5 block text-xs text-neutral-500">
              Only an admin can book seats for this showtime. Everyone else sees a message
              telling them to contact Shree Movies booking ({BOOKING_CONTACT_PHONE}) instead of
              the seat picker.
            </span>
          </span>
        </label>
      </div>
      <div className="sm:col-span-2">
        <label className="flex items-start gap-2 text-sm text-neutral-300">
          <input
            type="checkbox"
            name="soldOutOverride"
            defaultChecked={showtime?.sold_out_override ?? false}
            className="mt-0.5 h-4 w-4 rounded border-neutral-700 bg-neutral-950 accent-red-600"
          />
          <span>
            Mark sold out
            <span className="mt-0.5 block text-xs text-neutral-500">
              Shows a disabled &quot;Sold out&quot; label on the movie page instead of a bookable
              button for this showtime — regardless of how many seats technically remain. Use
              this when the leftover seats aren&apos;t actually being sold online.
            </span>
          </span>
        </label>
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

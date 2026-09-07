"use client";

import { useActionState } from "react";
import { createPromoCodeAction } from "@/app/actions/promotions";
import type { ShowtimeWithMovie } from "@/lib/data";
import { formatVenueDateTime } from "@/lib/timezone";

export default function PromoCodeForm({ showtimes }: { showtimes: ShowtimeWithMovie[] }) {
  const [state, formAction, isPending] = useActionState(createPromoCodeAction, undefined);

  return (
    <form
      action={formAction}
      className="grid grid-cols-1 gap-4 rounded-lg border border-neutral-800 bg-neutral-900 p-5 sm:grid-cols-4"
    >
      <div>
        <label className="mb-1 block text-sm text-neutral-300">Code</label>
        <input
          name="code"
          required
          placeholder="e.g. MIRZA10"
          className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm uppercase outline-none focus:border-red-500"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm text-neutral-300">Discount %</label>
        <input
          type="number"
          name="discountPercent"
          min={1}
          max={100}
          defaultValue={10}
          required
          className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-red-500"
        />
      </div>
      <div className="sm:col-span-2">
        <label className="mb-1 block text-sm text-neutral-300">
          Restrict to showtime (optional)
        </label>
        <select
          name="showtimeId"
          defaultValue=""
          className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-red-500"
        >
          <option value="">Any showtime</option>
          {showtimes.map((st) => (
            <option key={st.id} value={st.id}>
              {st.movie_title} — {formatVenueDateTime(st.starts_at)}
            </option>
          ))}
        </select>
      </div>

      <div className="sm:col-span-4">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Creating…" : "Create code"}
        </button>
        {state?.error && <p className="mt-2 text-sm text-red-400">{state.error}</p>}
        {state?.success && <p className="mt-2 text-sm text-green-400">{state.success}</p>}
        <p className="mt-2 text-xs text-neutral-500">
          Each code is single-use — once redeemed on a booking, it can&apos;t be used again. To
          send a personal code per customer (so nobody else can use theirs), create one code per
          person here with their own text, e.g. &quot;YASIN-7970&quot;.
        </p>
      </div>
    </form>
  );
}

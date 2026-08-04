"use client";

import { useMemo, useState } from "react";
import { useActionState } from "react";
import { bookSeatsAction } from "@/app/actions/booking";
import type { Seat } from "@/lib/types";

export default function SeatPicker({
  showtimeId,
  seats,
  priceCents,
  isLoggedIn,
  returnTo,
}: {
  showtimeId: string;
  seats: Seat[];
  priceCents: number;
  isLoggedIn: boolean;
  returnTo: string;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [state, formAction, isPending] = useActionState(bookSeatsAction, undefined);

  const rows = useMemo(() => {
    const map = new Map<string, Seat[]>();
    for (const seat of seats) {
      if (!map.has(seat.row_label)) map.set(seat.row_label, []);
      map.get(seat.row_label)!.push(seat);
    }
    // Back row (last letter, e.g. "R") at the top, front row closest to the
    // screen (e.g. "A") at the bottom — matches how the theater's own
    // box-office seating chart is laid out, for every screen.
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [seats]);

  // Real seat maps have irregular rows (gaps for aisles, pillars, short
  // rows). Placing every seat in a CSS grid column that matches its actual
  // seat number (instead of just packing seats next to each other) makes
  // those real gaps show up on screen instead of hiding them.
  const maxCol = useMemo(
    () => seats.reduce((max, s) => Math.max(max, s.col_number), 0),
    [seats]
  );

  function toggleSeat(seat: Seat) {
    if (seat.status !== "available") return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(seat.id)) next.delete(seat.id);
      else next.add(seat.id);
      return next;
    });
  }

  const total = selected.size * priceCents;

  return (
    <div>
      <div className="mb-6 flex justify-center">
        <div className="w-full max-w-md rounded-md border-b-4 border-neutral-600 bg-neutral-800/50 py-2 text-center text-xs uppercase tracking-widest text-neutral-400">
          Screen
        </div>
      </div>

      {/* The outer div owns the horizontal scroll (for wide real seat maps on
          narrow screens); the inner div centers itself via mx-auto when it's
          narrower than the viewport, and simply left-aligns (scroll starts
          at the true left edge, row labels included) when it's wider. */}
      <div className="overflow-x-auto px-2">
        <div className="flex w-fit flex-col gap-1.5 mx-auto">
          {rows.map(([rowLabel, rowSeats]) => (
            <div key={rowLabel} className="flex items-center gap-2">
              <span className="w-4 shrink-0 text-xs text-neutral-500">{rowLabel}</span>
              <div
                className="grid gap-1.5"
                style={{ gridTemplateColumns: `repeat(${maxCol}, 1.5rem)` }}
              >
                {rowSeats.map((seat) => {
                  const isSelected = selected.has(seat.id);
                  const isTaken = seat.status !== "available";
                  return (
                    <button
                      key={seat.id}
                      type="button"
                      disabled={isTaken}
                      onClick={() => toggleSeat(seat)}
                      title={`${rowLabel}${seat.col_number}`}
                      style={{ gridColumnStart: seat.col_number }}
                      className={[
                        "h-6 w-6 rounded-t-md text-[9px] font-medium leading-6 transition",
                        isTaken
                          ? "cursor-not-allowed bg-neutral-800 text-neutral-700"
                          : isSelected
                          ? "bg-red-600 text-white"
                          : "bg-neutral-700 text-neutral-300 hover:bg-neutral-600",
                      ].join(" ")}
                    >
                      {seat.col_number}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-neutral-400">
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded bg-neutral-700" /> Available
        </span>
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded bg-red-600" /> Selected
        </span>
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded bg-neutral-800" /> Taken
        </span>
      </div>

      <form action={formAction} className="mx-auto mt-8 max-w-sm">
        <input type="hidden" name="showtimeId" value={showtimeId} />
        <input type="hidden" name="returnTo" value={returnTo} />
        {Array.from(selected).map((seatId) => (
          <input key={seatId} type="hidden" name="seatIds" value={seatId} />
        ))}

        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
          <div className="flex justify-between text-sm text-neutral-400">
            <span>Seats selected</span>
            <span>{selected.size}</span>
          </div>
          <div className="mt-1 flex justify-between text-lg font-semibold">
            <span>Total</span>
            <span>${(total / 100).toFixed(2)}</span>
          </div>
        </div>

        {state?.error && (
          <p className="mt-3 text-sm text-red-400">{state.error}</p>
        )}

        {!isLoggedIn && (
          <p className="mt-3 text-sm text-neutral-400">
            You&apos;ll be asked to log in before checkout.
          </p>
        )}

        <button
          type="submit"
          disabled={selected.size === 0 || isPending}
          className="mt-4 w-full rounded-md bg-red-600 py-2.5 font-medium text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Processing…" : `Continue to checkout`}
        </button>
      </form>
    </div>
  );
}

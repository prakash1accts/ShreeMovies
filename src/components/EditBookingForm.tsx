"use client";

import { useActionState, useMemo, useState } from "react";
import { editBookingSeatsAction } from "@/app/actions/admin";
import type { Booking, Seat } from "@/lib/types";

export default function EditBookingForm({
  booking,
  seats,
  currentSeatIds,
}: {
  booking: Booking;
  seats: Seat[];
  currentSeatIds: string[];
}) {
  const [state, formAction, isPending] = useActionState(editBookingSeatsAction, undefined);
  const [selected, setSelected] = useState<Set<string>>(new Set(currentSeatIds));
  const targetCount = currentSeatIds.length;

  const rows = useMemo(() => {
    const map = new Map<string, Seat[]>();
    for (const seat of seats) {
      if (!map.has(seat.row_label)) map.set(seat.row_label, []);
      map.get(seat.row_label)!.push(seat);
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [seats]);
  const maxCol = useMemo(
    () => seats.reduce((max, s) => Math.max(max, s.col_number), 0),
    [seats]
  );

  function toggleSeat(seat: Seat) {
    const isMine = currentSeatIds.includes(seat.id);
    if (!isMine && seat.status !== "available") return; // genuinely taken by someone else
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(seat.id)) {
        next.delete(seat.id);
      } else {
        if (next.size >= targetCount) return prev;
        next.add(seat.id);
      }
      return next;
    });
  }

  return (
    <form action={formAction} className="rounded-lg border border-neutral-800 bg-neutral-900 p-5">
      <input type="hidden" name="bookingId" value={booking.id} />
      {Array.from(selected).map((seatId) => (
        <input key={seatId} type="hidden" name="seatIds" value={seatId} />
      ))}

      <p className="mb-3 text-sm text-neutral-300">
        Select exactly <strong>{targetCount}</strong> seat{targetCount === 1 ? "" : "s"} — selected:{" "}
        {selected.size}. The booking&apos;s current seats are shown as available to keep or swap
        out; every other seat reflects its real availability.
      </p>

      <div className="overflow-x-auto px-2">
        <div className="flex w-fit flex-col gap-1.5">
          {rows.map(([rowLabel, rowSeats]) => (
            <div key={rowLabel} className="flex items-center gap-2">
              <span className="w-4 shrink-0 text-xs text-neutral-500">{rowLabel}</span>
              <div
                className="grid gap-1.5"
                style={{ gridTemplateColumns: `repeat(${maxCol}, 1.5rem)` }}
              >
                {rowSeats.map((seat) => {
                  const isMine = currentSeatIds.includes(seat.id);
                  const isSelected = selected.has(seat.id);
                  const isTaken = !isMine && seat.status !== "available";
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
                          ? "bg-blue-600 text-white"
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

      {state?.error && <p className="mt-4 text-sm text-red-400">{state.error}</p>}

      <button
        type="submit"
        disabled={isPending || selected.size !== targetCount}
        className="mt-5 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Saving…" : "Save seat changes"}
      </button>
    </form>
  );
}

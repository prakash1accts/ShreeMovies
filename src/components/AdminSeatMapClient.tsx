"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { AdminSeatMapSeat } from "@/lib/data";
import { blockSeatsAction, unblockSeatsAction } from "@/app/actions/admin";

// Interactive half of the admin seat-map page — the static header (movie
// title, screen, showtime) stays server-rendered in page.tsx; everything
// that needs client state (selection for blocking/unblocking) lives here.
export default function AdminSeatMapClient({
  showtimeId,
  seats,
}: {
  showtimeId: string;
  seats: AdminSeatMapSeat[];
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const rowMap = new Map<string, AdminSeatMapSeat[]>();
  for (const seat of seats) {
    if (!rowMap.has(seat.row_label)) rowMap.set(seat.row_label, []);
    rowMap.get(seat.row_label)!.push(seat);
  }
  // Same back-row-on-top ordering as the customer-facing SeatPicker, so the
  // layout looks identical to what the customer chose from.
  const rows = Array.from(rowMap.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  const maxCol = seats.reduce((max, s) => Math.max(max, s.col_number), 0);

  const bookedCount = seats.filter((s) => s.status === "booked").length;
  const heldCount = seats.filter((s) => s.status === "held").length;
  const blockedCount = seats.filter((s) => s.status === "blocked").length;
  const availableCount = seats.filter((s) => s.status === "available").length;

  const selectedSeats = seats.filter((s) => selected.has(s.id));
  const canBlock = selectedSeats.length > 0 && selectedSeats.every((s) => s.status === "available");
  const canUnblock = selectedSeats.length > 0 && selectedSeats.every((s) => s.status === "blocked");

  function toggle(seat: AdminSeatMapSeat) {
    // Only available/blocked seats are selectable — booked/held seats open
    // their booking on click instead (handled by the Link wrapper below).
    if (seat.status !== "available" && seat.status !== "blocked") return;
    setError(null);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(seat.id)) next.delete(seat.id);
      else next.add(seat.id);
      return next;
    });
  }

  function runAction(action: (fd: FormData) => Promise<void>) {
    setError(null);
    const fd = new FormData();
    fd.set("showtimeId", showtimeId);
    for (const id of selected) fd.append("seatIds", id);
    startTransition(async () => {
      try {
        await action(fd);
        setSelected(new Set());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  return (
    <div>
      <div className="flex flex-wrap gap-4 text-sm text-neutral-400">
        <span>
          <span className="font-medium text-red-300">{bookedCount}</span> booked
        </span>
        <span>
          <span className="font-medium text-green-300">{heldCount}</span> held (payment pending)
        </span>
        <span>
          <span className="font-medium text-orange-300">{blockedCount}</span> blocked
        </span>
        <span>
          <span className="font-medium text-neutral-300">{availableCount}</span> available
        </span>
      </div>

      {seats.length === 0 ? (
        <p className="mt-8 text-neutral-400">
          This showtime has no seats yet — it may not have finished being created.
        </p>
      ) : (
        <>
          <div className="mt-8 overflow-x-auto px-2">
            <div className="flex w-fit flex-col gap-1.5">
              {rows.map(([rowLabel, rowSeats]) => (
                <div key={rowLabel} className="flex items-center gap-2">
                  <span className="w-4 shrink-0 text-xs text-neutral-500">{rowLabel}</span>
                  <div
                    className="grid gap-1.5"
                    style={{ gridTemplateColumns: `repeat(${maxCol}, 1.75rem)` }}
                  >
                    {rowSeats.map((seat) => {
                      const isSelected = selected.has(seat.id);
                      const title =
                        seat.status === "available"
                          ? `${rowLabel}${seat.col_number} — available`
                          : seat.status === "blocked"
                          ? `${rowLabel}${seat.col_number} — blocked`
                          : `${rowLabel}${seat.col_number} — ${
                              seat.status === "held" ? "held, payment pending" : "booked"
                            }${seat.customer_name ? ` — ${seat.customer_name}` : ""}${
                              seat.booking_number ? ` (#${seat.booking_number})` : ""
                            }${seat.checked_in_at ? " — admitted" : ""}`;
                      const clickable = seat.status === "available" || seat.status === "blocked";
                      const seatEl = (
                        <div
                          title={title}
                          style={{ gridColumnStart: seat.col_number }}
                          onClick={clickable ? () => toggle(seat) : undefined}
                          className={[
                            "flex h-7 w-7 items-center justify-center rounded-t-md text-[9px] font-medium leading-none",
                            clickable ? "cursor-pointer" : "",
                            isSelected
                              ? "ring-2 ring-blue-400 bg-blue-700 text-blue-100"
                              : seat.status === "booked"
                              ? "bg-red-900 text-red-200"
                              : seat.status === "held"
                              ? "bg-green-800 text-green-200"
                              : seat.status === "blocked"
                              ? "bg-orange-900 text-orange-300"
                              : "bg-neutral-700 text-neutral-300",
                          ].join(" ")}
                        >
                          {seat.col_number}
                        </div>
                      );
                      return seat.booking_id ? (
                        <Link
                          key={seat.id}
                          href={`/admin/bookings/${seat.booking_id}/edit`}
                          className="contents"
                        >
                          {seatEl}
                        </Link>
                      ) : (
                        <div key={seat.id} className="contents">
                          {seatEl}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 flex justify-center">
            <div className="w-full max-w-md rounded-md border-t-4 border-neutral-600 bg-neutral-800/50 py-2 text-center text-xs uppercase tracking-widest text-neutral-400">
              Screen
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-neutral-400">
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded bg-neutral-700" /> Available
            </span>
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded bg-green-800" /> Held (payment pending)
            </span>
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded bg-red-900" /> Booked
            </span>
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded bg-orange-900" /> Blocked
            </span>
          </div>
          <p className="mt-3 text-center text-xs text-neutral-500">
            Click a booked or held seat to open that booking. Click an available or blocked seat to
            select it, then use the buttons below.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 border-t border-neutral-800 pt-4">
            <span className="text-sm text-neutral-400">
              {selected.size > 0
                ? `${selected.size} seat${selected.size === 1 ? "" : "s"} selected`
                : "Select available or blocked seats to block/unblock them"}
            </span>
            <button
              type="button"
              disabled={!canBlock || pending}
              onClick={() => runAction(blockSeatsAction)}
              className="rounded-md bg-orange-900 px-3 py-1.5 text-sm font-medium text-orange-200 hover:bg-orange-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Block selected
            </button>
            <button
              type="button"
              disabled={!canUnblock || pending}
              onClick={() => runAction(unblockSeatsAction)}
              className="rounded-md bg-neutral-700 px-3 py-1.5 text-sm font-medium text-neutral-200 hover:bg-neutral-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Unblock selected
            </button>
          </div>
          {error && <p className="mt-2 text-center text-sm text-red-400">{error}</p>}
        </>
      )}
    </div>
  );
}

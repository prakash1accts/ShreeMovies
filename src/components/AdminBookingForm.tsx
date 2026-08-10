"use client";

import { useActionState, useMemo, useState } from "react";
import { createAdminBookingAction } from "@/app/actions/admin";
import type { Seat } from "@/lib/types";
import type { ShowtimeWithMovie } from "@/lib/data";
import { formatVenueDateTime } from "@/lib/timezone";

export default function AdminBookingForm({
  showtimes,
  seatsByShowtime,
}: {
  showtimes: ShowtimeWithMovie[];
  seatsByShowtime: Record<string, Seat[]>;
}) {
  const [state, formAction, isPending] = useActionState(createAdminBookingAction, undefined);

  const [showtimeId, setShowtimeId] = useState(showtimes[0]?.id ?? "");
  const [ticketCount, setTicketCount] = useState(1);
  const [unitPrice, setUnitPrice] = useState(
    showtimes[0] ? (showtimes[0].price_cents / 100).toFixed(2) : ""
  );
  const [autoAllocate, setAutoAllocate] = useState<"yes" | "no">("yes");
  const [paymentTerms, setPaymentTerms] = useState<"cash" | "deposit">("cash");
  const [selectedSeats, setSelectedSeats] = useState<Set<string>>(new Set());

  const seats = useMemo(
    () => seatsByShowtime[showtimeId] ?? [],
    [seatsByShowtime, showtimeId]
  );

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

  function handleShowtimeChange(id: string) {
    setShowtimeId(id);
    setSelectedSeats(new Set());
    const st = showtimes.find((s) => s.id === id);
    if (st) setUnitPrice((st.price_cents / 100).toFixed(2));
  }

  function toggleSeat(seat: Seat) {
    if (seat.status !== "available") return;
    setSelectedSeats((prev) => {
      const next = new Set(prev);
      if (next.has(seat.id)) {
        next.delete(seat.id);
      } else {
        if (next.size >= ticketCount) return prev; // already have enough
        next.add(seat.id);
      }
      return next;
    });
  }

  const total = (Number(unitPrice) || 0) * ticketCount;
  const manualCountOk = autoAllocate === "no" ? selectedSeats.size === ticketCount : true;

  return (
    <form
      action={formAction}
      className="rounded-lg border border-neutral-800 bg-neutral-900 p-5"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm text-neutral-300">Showtime</label>
          <select
            name="showtimeId"
            value={showtimeId}
            onChange={(e) => handleShowtimeChange(e.target.value)}
            className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-red-500"
          >
            {showtimes.length === 0 && <option value="">No upcoming showtimes</option>}
            {showtimes.map((st) => (
              <option key={st.id} value={st.id}>
                {st.movie_title} — {formatVenueDateTime(st.starts_at)} — {st.screen_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm text-neutral-300">Customer name</label>
          <input
            name="customerName"
            required
            className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-red-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-neutral-300">No. of tickets</label>
          <input
            type="number"
            name="ticketCount"
            min={1}
            value={ticketCount}
            onChange={(e) => {
              const n = Math.max(1, Number(e.target.value) || 1);
              setTicketCount(n);
              setSelectedSeats(new Set());
            }}
            className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-red-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-neutral-300">Price per ticket (AOA)</label>
          <input
            type="number"
            step="0.01"
            min={0}
            name="unitPrice"
            value={unitPrice}
            onChange={(e) => setUnitPrice(e.target.value)}
            className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-red-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-neutral-300">Total value</label>
          <input
            readOnly
            value={`AOA ${total.toFixed(2)}`}
            className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-400"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-neutral-300">Payment terms</label>
          <select
            name="paymentTerms"
            value={paymentTerms}
            onChange={(e) => setPaymentTerms(e.target.value as "cash" | "deposit")}
            className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-red-500"
          >
            <option value="cash">Cash</option>
            <option value="deposit">Deposit</option>
          </select>
        </div>

        {paymentTerms === "deposit" && (
          <>
            <div>
              <label className="mb-1 block text-sm text-neutral-300">Deposit reference</label>
              <input
                name="depositReference"
                placeholder="e.g. bank transfer ref / receipt #"
                className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-red-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-neutral-300">Deposit date</label>
              <input
                type="date"
                name="depositDate"
                className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-red-500"
              />
            </div>
          </>
        )}

        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm text-neutral-300">Seat allocation</label>
          <div className="flex gap-4 text-sm text-neutral-300">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="autoAllocate"
                value="yes"
                checked={autoAllocate === "yes"}
                onChange={() => setAutoAllocate("yes")}
              />
              Automatic — system picks the best seats together
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="autoAllocate"
                value="no"
                checked={autoAllocate === "no"}
                onChange={() => setAutoAllocate("no")}
              />
              Manual — I&apos;ll pick the seats
            </label>
          </div>
        </div>
      </div>

      {autoAllocate === "no" && (
        <div className="mt-5 rounded-md border border-neutral-800 bg-neutral-950 p-4">
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="text-neutral-300">
              Select exactly <strong>{ticketCount}</strong> seat
              {ticketCount === 1 ? "" : "s"} — selected: {selectedSeats.size}
            </span>
          </div>

          {seats.length === 0 ? (
            <p className="text-sm text-neutral-500">
              No seat map available for this showtime.
            </p>
          ) : (
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
                        const isSelected = selectedSeats.has(seat.id);
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
          )}

          {Array.from(selectedSeats).map((seatId) => (
            <input key={seatId} type="hidden" name="seatIds" value={seatId} />
          ))}
        </div>
      )}

      {state?.error && <p className="mt-4 text-sm text-red-400">{state.error}</p>}

      <div className="mt-5">
        <button
          type="submit"
          disabled={isPending || showtimes.length === 0 || !manualCountOk}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Creating…" : "Create booking"}
        </button>
        {autoAllocate === "no" && !manualCountOk && (
          <span className="ml-3 text-xs text-neutral-500">
            Select {ticketCount} seat{ticketCount === 1 ? "" : "s"} to continue.
          </span>
        )}
      </div>
    </form>
  );
}

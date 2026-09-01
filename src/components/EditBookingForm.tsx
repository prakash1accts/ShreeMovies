"use client";

import { useActionState, useMemo, useState } from "react";
import { editBookingDetailsAction } from "@/app/actions/admin";
import type { Booking, Seat } from "@/lib/types";

export default function EditBookingForm({
  booking,
  seats,
  currentSeatIds,
  initialDepositDate,
}: {
  booking: Booking;
  seats: Seat[];
  currentSeatIds: string[];
  // booking.deposit_date comes back from the database as a DATE column —
  // computed server-side into a plain "YYYY-MM-DD" string (or "") before
  // reaching this client component, since a raw Date value can't safely
  // cross that boundary as a date-input default.
  initialDepositDate: string;
}) {
  const [state, formAction, isPending] = useActionState(editBookingDetailsAction, undefined);

  const [ticketCount, setTicketCount] = useState(Math.max(1, currentSeatIds.length));
  const [unitPrice, setUnitPrice] = useState(() => {
    // Admin-entered bookings have their own per-ticket price already; online
    // bookings never set one, so fall back to splitting the total evenly
    // across the current seats as a starting point for the admin to adjust.
    const cents =
      booking.unit_price_cents ??
      Math.round(booking.total_cents / Math.max(1, currentSeatIds.length));
    return (cents / 100).toFixed(2);
  });
  const [paymentTerms, setPaymentTerms] = useState<"cash" | "deposit">(
    booking.payment_terms === "deposit" ? "deposit" : "cash"
  );
  const [depositReference, setDepositReference] = useState(booking.deposit_reference ?? "");
  const [depositDate, setDepositDate] = useState(initialDepositDate);
  const [selected, setSelected] = useState<Set<string>>(new Set(currentSeatIds));

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

  function handleTicketCountChange(raw: string) {
    const n = Math.max(1, Number(raw) || 1);
    setTicketCount(n);
    // Shrinking the count can leave more seats selected than now allowed —
    // trim down to the new limit rather than blocking the count change.
    setSelected((prev) => (prev.size <= n ? prev : new Set(Array.from(prev).slice(0, n))));
  }

  function toggleSeat(seat: Seat) {
    const isMine = currentSeatIds.includes(seat.id);
    if (!isMine && seat.status !== "available") return; // genuinely taken by someone else
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(seat.id)) {
        next.delete(seat.id);
      } else {
        if (next.size >= ticketCount) return prev;
        next.add(seat.id);
      }
      return next;
    });
  }

  const total = (Number(unitPrice) || 0) * ticketCount;

  return (
    <form action={formAction} className="rounded-lg border border-neutral-800 bg-neutral-900 p-5">
      <input type="hidden" name="bookingId" value={booking.id} />
      {Array.from(selected).map((seatId) => (
        <input key={seatId} type="hidden" name="seatIds" value={seatId} />
      ))}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm text-neutral-300">No. of tickets</label>
          <input
            type="number"
            min={1}
            value={ticketCount}
            onChange={(e) => handleTicketCountChange(e.target.value)}
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
                value={depositReference}
                onChange={(e) => setDepositReference(e.target.value)}
                placeholder="e.g. bank transfer ref / receipt #"
                className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-red-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-neutral-300">Deposit date</label>
              <input
                type="date"
                name="depositDate"
                value={depositDate}
                onChange={(e) => setDepositDate(e.target.value)}
                className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-red-500"
              />
            </div>
          </>
        )}
      </div>

      <p className="mb-3 mt-5 text-sm text-neutral-300">
        Select exactly <strong>{ticketCount}</strong> seat{ticketCount === 1 ? "" : "s"} —
        selected: {selected.size}. The booking&apos;s current seats are shown as available to keep
        or swap out; every other seat reflects its real availability.
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
        disabled={isPending || selected.size !== ticketCount}
        className="mt-5 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Saving…" : "Save changes"}
      </button>
      {selected.size !== ticketCount && (
        <span className="ml-3 text-xs text-neutral-500">
          Select {ticketCount} seat{ticketCount === 1 ? "" : "s"} to continue.
        </span>
      )}
    </form>
  );
}

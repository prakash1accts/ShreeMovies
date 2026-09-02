"use client";

import { useRef, useState } from "react";
import { scanLookupAction, scanCheckInAction, type ScanLookupResult } from "@/app/actions/admin";
import { formatVenueDateTime, formatVenueTime } from "@/lib/timezone";

// Continuous-scanning screen for the door: a handheld 2D/QR scanner behaves
// like a keyboard, "typing" the ticket's verify URL into whatever's
// focused and then sending Enter. Instead of navigating to /verify/<ref>
// (which would leave the address bar unfocused for the next scan), this
// page keeps one text input permanently focused and calls the lookup/admit
// Server Functions directly, so staff can fire scan after scan with zero
// taps in between.
export default function ScanClient() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [pending, setPending] = useState(false);
  const [admitting, setAdmitting] = useState(false);
  const [result, setResult] = useState<ScanLookupResult | null>(null);
  const [scanCount, setScanCount] = useState(0);

  function vibrate(pattern: number | number[]) {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Not supported on this device/browser — a nice-to-have, not
        // required for the page to work.
      }
    }
  }

  // Fires on every click anywhere in the page, including a tap on the
  // Admit button — event bubbling means the button's own onClick already
  // ran by the time this reaches the container, so it never steals a click
  // away from a button, it just returns focus to the scan input right
  // after.
  function refocus() {
    inputRef.current?.focus();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const raw = value.trim();
    setValue("");
    if (!raw) return;
    setPending(true);
    try {
      const res = await scanLookupAction(raw);
      setResult(res);
      setScanCount((n) => n + 1);
      vibrate(res.found && res.status === "paid" && !res.checkedInAt ? 60 : [80, 60, 80]);
    } catch {
      setResult({ found: false, ref: raw });
      vibrate([80, 60, 80]);
    } finally {
      setPending(false);
      inputRef.current?.focus();
    }
  }

  async function handleAdmit() {
    if (!result || !result.found) return;
    setAdmitting(true);
    try {
      const res = await scanCheckInAction(result.bookingId, result.ref);
      setResult(res);
      vibrate(60);
    } finally {
      setAdmitting(false);
      inputRef.current?.focus();
    }
  }

  const status = !result
    ? null
    : !result.found
    ? {
        label: "NOT FOUND",
        emoji: "❓",
        classes: "border-neutral-700 bg-neutral-800/60 text-neutral-300",
      }
    : result.status === "paid"
    ? { label: "VALID — PAID", emoji: "✅", classes: "border-green-700 bg-green-950/40 text-green-300" }
    : result.status === "cancelled"
    ? {
        label: "CANCELLED — DO NOT ADMIT",
        emoji: "❌",
        classes: "border-red-800 bg-red-950/40 text-red-300",
      }
    : {
        label: "PENDING PAYMENT — NOT YET VALID",
        emoji: "⏳",
        classes: "border-yellow-800 bg-yellow-950/40 text-yellow-300",
      };

  return (
    <div onClick={refocus} className="mx-auto max-w-md pb-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Scan Tickets</h1>
        <span className="text-xs text-neutral-500">{scanCount} scanned this session</span>
      </div>
      <p className="mt-1 text-sm text-neutral-400">
        Point the scanner at a ticket&apos;s QR code — the result appears below automatically.
        No need to tap anything between scans.
      </p>

      <form onSubmit={handleSubmit} className="mt-4">
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => {
            // The moment a new scan starts arriving, clear whatever the
            // previous scan showed, so half-typed input never gets
            // confused with the last result on screen.
            if (result) setResult(null);
            setValue(e.target.value);
          }}
          onBlur={() => {
            window.setTimeout(() => {
              if (document.activeElement === document.body) inputRef.current?.focus();
            }, 50);
          }}
          autoFocus
          autoComplete="off"
          spellCheck={false}
          placeholder="Ready to scan…"
          className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-4 py-3 text-center text-lg text-neutral-100 outline-none focus:border-red-500"
        />
      </form>

      {pending && <p className="mt-4 text-center text-sm text-neutral-400">Looking up…</p>}

      {status && (
        <div className="mt-4 space-y-4">
          <div className={`rounded-lg border p-4 text-center text-lg font-bold ${status.classes}`}>
            {status.emoji} {status.label}
          </div>

          {result && !result.found && (
            <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 text-sm text-neutral-400">
              No booking found for reference <span className="font-mono">{result.ref}</span>.
              This ticket may not be valid, or belongs to a different booking.
            </div>
          )}

          {result && result.found && (
            <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-5">
              <div className="text-lg font-semibold">{result.movieTitle}</div>
              <div className="mt-1 text-sm text-neutral-400">
                {formatVenueDateTime(result.startsAt)} · {result.screenName}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-neutral-500">Booking ref</div>
                  <div className="font-medium">{result.bookingNumber || result.bookingId}</div>
                </div>
                <div>
                  <div className="text-neutral-500">Seats</div>
                  <div className="font-medium">{result.seatLabels}</div>
                </div>
                <div>
                  <div className="text-neutral-500">Customer</div>
                  <div className="font-medium">{result.customerName}</div>
                </div>
                <div>
                  <div className="text-neutral-500">Phone</div>
                  <div className="font-medium">{result.phone || "—"}</div>
                </div>
                <div>
                  <div className="text-neutral-500">Total</div>
                  <div className="font-medium">AOA {(result.totalCents / 100).toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-neutral-500">Payment</div>
                  <div className="font-medium">
                    {result.paymentTerms === "deposit"
                      ? "Deposit"
                      : result.paymentTerms === "cash"
                      ? "Cash"
                      : "Online"}
                  </div>
                </div>
              </div>

              {result.seatsChangedNote && (
                <div className="mt-4 rounded-md border border-amber-800 bg-amber-950/30 p-3 text-xs text-amber-300">
                  ⚠ {result.seatsChangedNote}
                </div>
              )}
            </div>
          )}

          {result &&
            result.found &&
            result.status === "paid" &&
            (result.checkedInAt ? (
              <div className="rounded-lg border border-blue-800 bg-blue-950/30 p-4 text-center text-sm font-semibold text-blue-300">
                ✅ Already admitted at {formatVenueTime(result.checkedInAt)}
              </div>
            ) : (
              <button
                type="button"
                onClick={handleAdmit}
                disabled={admitting}
                className="w-full rounded-md bg-green-700 px-4 py-3 text-center text-base font-semibold text-white hover:bg-green-600 disabled:opacity-50"
              >
                {admitting ? "Admitting…" : "✅ Admit — Confirm Entry"}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

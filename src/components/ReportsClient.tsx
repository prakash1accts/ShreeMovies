"use client";

import { useMemo, useState } from "react";
import type { BookingWithDetails, ShowtimeWithMovie } from "@/lib/data";
import { formatVenueDateTime } from "@/lib/timezone";

function toCSV(rows: string[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const s = String(cell ?? "");
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(",")
    )
    .join("\n");
}

function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// "Admitted" once staff have tapped Admit on this booking's ticket
// (checked_in_at set), otherwise "Not yet" — shown next to Status so anyone
// reading the report can see who's actually walked in, not just who paid.
function attendanceLabel(b: BookingWithDetails): string {
  return b.checked_in_at ? "Admitted" : "Not yet";
}

// Every seat-swap/seat-count edit keeps seat_labels as the source of truth for
// how many seats a booking actually holds, so ticket counts everywhere in the
// reports derive from it rather than from a separately-stored count that
// could drift out of sync.
function ticketCount(b: BookingWithDetails): number {
  return (b.seat_labels || "").split(",").filter(Boolean).length;
}

// Sorts ascending by the human-friendly Booking Ref (e.g. "MIRZ061112") so
// every report reads in the same predictable order the front desk expects,
// instead of the newest-booking-first order the underlying query returns.
// Plain string comparison is enough — the ref format keeps its parts (movie
// letters, day, hour, per-showtime sequence) fixed-width, so alphabetical
// order matches numeric order within each of those grouped positions. A
// booking that hasn't been assigned a ref yet (only ever pending/cancelled
// bookings that never got paid) sorts after every booking that has one.
function compareByBookingRef(a: BookingWithDetails, b: BookingWithDetails): number {
  const refA = a.booking_number;
  const refB = b.booking_number;
  if (refA && refB) return refA < refB ? -1 : refA > refB ? 1 : 0;
  if (refA) return -1;
  if (refB) return 1;
  return 0;
}

export default function ReportsClient({
  bookings,
  showtimes,
}: {
  bookings: BookingWithDetails[];
  showtimes: ShowtimeWithMovie[];
}) {
  const [showtimeId, setShowtimeId] = useState<string>("");
  const [absenteeShowtimeId, setAbsenteeShowtimeId] = useState<string>("");
  const [printMode, setPrintMode] = useState<"audience" | "security" | "absentee" | null>(null);

  // Sorted once here, ascending by Booking Ref — every report below (audience,
  // security, absentee) derives from this same ordered list, via filters that
  // preserve order, so all three stay consistently sorted without re-sorting
  // each one separately.
  const sortedBookings = useMemo(
    () => [...bookings].sort(compareByBookingRef),
    [bookings]
  );
  const paidBookings = useMemo(
    () => sortedBookings.filter((b) => b.status === "paid"),
    [sortedBookings]
  );
  const securityRows = useMemo(
    () => paidBookings.filter((b) => !showtimeId || b.showtime_id === showtimeId),
    [paidBookings, showtimeId]
  );
  // Paid, but never scanned in at the door — the people to follow up with
  // after a show so staff know who to call about a no-show seat.
  const absenteeRows = useMemo(
    () =>
      paidBookings.filter(
        (b) => !b.checked_in_at && (!absenteeShowtimeId || b.showtime_id === absenteeShowtimeId)
      ),
    [paidBookings, absenteeShowtimeId]
  );

  // Audience report footer totals — ticket count and revenue across every
  // booking shown (all statuses, per the report's own "every status" scope).
  const audienceTotals = useMemo(
    () =>
      sortedBookings.reduce(
        (acc, b) => ({
          tickets: acc.tickets + ticketCount(b),
          cents: acc.cents + b.total_cents,
        }),
        { tickets: 0, cents: 0 }
      ),
    [sortedBookings]
  );

  function exportAudienceCSV() {
    const header = [
      "Customer",
      "Movie",
      "Showtime",
      "Seats",
      "No. of Tickets",
      "Total",
      "Payment",
      "Status",
      "Attendance",
      "Booked At",
    ];
    const rows = sortedBookings.map((b) => [
      b.customer_name || "",
      b.movie_title,
      formatVenueDateTime(b.starts_at),
      b.seat_labels || "",
      String(ticketCount(b)),
      (b.total_cents / 100).toFixed(2),
      b.payment_terms || "",
      b.status,
      attendanceLabel(b),
      formatVenueDateTime(b.created_at),
    ]);
    const totalsRow = [
      "Grand total",
      "",
      "",
      "",
      String(audienceTotals.tickets),
      (audienceTotals.cents / 100).toFixed(2),
      "",
      "",
      "",
      "",
    ];
    downloadText("audience-report.csv", toCSV([header, ...rows, totalsRow]));
  }

  function exportSecurityCSV() {
    const header = ["Name", "No. of Tickets", "Seats"];
    const rows = securityRows.map((b) => [
      b.customer_name || "—",
      String((b.seat_labels || "").split(",").filter(Boolean).length),
      b.seat_labels || "",
    ]);
    downloadText("security-checkin-report.csv", toCSV([header, ...rows]));
  }

  function exportAbsenteeCSV() {
    const header = ["Customer", "Phone", "WhatsApp", "Seats", "Booking Ref", "Movie", "Showtime"];
    const rows = absenteeRows.map((b) => [
      b.customer_name || "—",
      b.account_phone || "",
      b.account_whatsapp || "",
      b.seat_labels || "",
      b.booking_number || b.id,
      b.movie_title,
      formatVenueDateTime(b.starts_at),
    ]);
    downloadText("absentee-report.csv", toCSV([header, ...rows]));
  }

  function printAudience() {
    setPrintMode("audience");
    setTimeout(() => window.print(), 50);
  }

  function printSecurity() {
    setPrintMode("security");
    setTimeout(() => window.print(), 50);
  }

  function printAbsentee() {
    setPrintMode("absentee");
    setTimeout(() => window.print(), 50);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <h1 className="text-2xl font-bold">Reports</h1>
      </div>

      <section className="mt-6 rounded-lg border border-neutral-800 bg-neutral-900 p-5 print:hidden">
        <h2 className="font-semibold">Audience report</h2>
        <p className="mt-1 text-sm text-neutral-400">All bookings, every status.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={exportAudienceCSV}
            className="rounded-md bg-neutral-800 px-3 py-1.5 text-sm text-neutral-200 hover:bg-neutral-700"
          >
            Download CSV
          </button>
          <button
            onClick={printAudience}
            className="rounded-md bg-neutral-800 px-3 py-1.5 text-sm text-neutral-200 hover:bg-neutral-700"
          >
            Print / Save as PDF
          </button>
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-neutral-800 bg-neutral-900 p-5 print:hidden">
        <h2 className="font-semibold">Security check-in report</h2>
        <p className="mt-1 text-sm text-neutral-400">
          Confirmed (paid) guests only — Name, number of tickets, and seat numbers, ready to hand
          to theatre security.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select
            value={showtimeId}
            onChange={(e) => setShowtimeId(e.target.value)}
            className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-red-500"
          >
            <option value="">All showtimes</option>
            {showtimes.map((st) => (
              <option key={st.id} value={st.id}>
                {st.movie_title} — {formatVenueDateTime(st.starts_at)}
              </option>
            ))}
          </select>
          <button
            onClick={exportSecurityCSV}
            className="rounded-md bg-neutral-800 px-3 py-1.5 text-sm text-neutral-200 hover:bg-neutral-700"
          >
            Download CSV
          </button>
          <button
            onClick={printSecurity}
            className="rounded-md bg-neutral-800 px-3 py-1.5 text-sm text-neutral-200 hover:bg-neutral-700"
          >
            Print / Save as PDF
          </button>
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-neutral-800 bg-neutral-900 p-5 print:hidden">
        <h2 className="font-semibold">Absentee report</h2>
        <p className="mt-1 text-sm text-neutral-400">
          Paid bookings for a showtime whose ticket was never scanned at the door — the people to
          call or WhatsApp about a no-show seat. Best run once the showtime's admission window has
          closed; pick the specific show below.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select
            value={absenteeShowtimeId}
            onChange={(e) => setAbsenteeShowtimeId(e.target.value)}
            className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-red-500"
          >
            <option value="">All showtimes</option>
            {showtimes.map((st) => (
              <option key={st.id} value={st.id}>
                {st.movie_title} — {formatVenueDateTime(st.starts_at)}
              </option>
            ))}
          </select>
          <button
            onClick={exportAbsenteeCSV}
            className="rounded-md bg-neutral-800 px-3 py-1.5 text-sm text-neutral-200 hover:bg-neutral-700"
          >
            Download CSV
          </button>
          <button
            onClick={printAbsentee}
            className="rounded-md bg-neutral-800 px-3 py-1.5 text-sm text-neutral-200 hover:bg-neutral-700"
          >
            Print / Save as PDF
          </button>
          <span className="text-sm text-neutral-500">
            {absenteeRows.length} absent{absenteeRows.length === 1 ? "" : "ees"}
          </span>
        </div>
        <div className="mt-4 overflow-x-auto rounded-md border border-neutral-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-950 text-neutral-400">
              <tr>
                <th className="px-3 py-2">Customer</th>
                <th className="px-3 py-2">Phone</th>
                <th className="px-3 py-2">WhatsApp</th>
                <th className="px-3 py-2">Seats</th>
                <th className="px-3 py-2">Booking Ref</th>
              </tr>
            </thead>
            <tbody>
              {absenteeRows.map((b) => (
                <tr key={b.id} className="border-t border-neutral-800">
                  <td className="px-3 py-2">{b.customer_name || "—"}</td>
                  <td className="px-3 py-2 text-neutral-400">{b.account_phone || "—"}</td>
                  <td className="px-3 py-2 text-neutral-400">{b.account_whatsapp || "—"}</td>
                  <td className="px-3 py-2 text-neutral-400">{b.seat_labels || "—"}</td>
                  <td className="px-3 py-2 text-neutral-500">
                    #{b.booking_number || b.id}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {absenteeRows.length === 0 && (
            <div className="p-4 text-center text-sm text-neutral-500">
              Nobody paid is missing a check-in for this selection.
            </div>
          )}
        </div>
        <p className="mt-2 text-xs text-neutral-500">
          Phone/WhatsApp is only on file for bookings placed by a registered account — walk-in /
          box-office sales won&apos;t have a number here unless one was noted elsewhere.
        </p>
      </section>

      {/* Printable security report — only rendered into the print output when
          "Print / Save as PDF" was clicked from that section. */}
      <div className={`mt-8 ${printMode === "security" ? "hidden print:block" : "hidden"}`}>
        <h2 className="text-lg font-bold text-black">Security Check-In Report</h2>
        <p className="text-sm text-neutral-700">
          {showtimeId
            ? showtimes.find((s) => s.id === showtimeId)?.movie_title +
              " — " +
              formatVenueDateTime(showtimes.find((s) => s.id === showtimeId)?.starts_at ?? "")
            : "All showtimes"}
        </p>
        <table className="mt-3 w-full border-collapse text-sm text-black">
          <thead>
            <tr className="border-b border-black">
              <th className="py-1 text-left">Name</th>
              <th className="py-1 text-left">No. of Tickets</th>
              <th className="py-1 text-left">Seats</th>
            </tr>
          </thead>
          <tbody>
            {securityRows.map((b) => (
              <tr key={b.id} className="border-b border-neutral-400">
                <td className="py-1">{b.customer_name || "—"}</td>
                <td className="py-1">{(b.seat_labels || "").split(",").filter(Boolean).length}</td>
                <td className="py-1">{b.seat_labels || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Printable absentee report */}
      <div className={`mt-8 ${printMode === "absentee" ? "hidden print:block" : "hidden"}`}>
        <h2 className="text-lg font-bold text-black">Absentee Report</h2>
        <p className="text-sm text-neutral-700">
          {absenteeShowtimeId
            ? showtimes.find((s) => s.id === absenteeShowtimeId)?.movie_title +
              " — " +
              formatVenueDateTime(
                showtimes.find((s) => s.id === absenteeShowtimeId)?.starts_at ?? ""
              )
            : "All showtimes"}
        </p>
        <table className="mt-3 w-full border-collapse text-sm text-black">
          <thead>
            <tr className="border-b border-black">
              <th className="py-1 text-left">Customer</th>
              <th className="py-1 text-left">Phone</th>
              <th className="py-1 text-left">WhatsApp</th>
              <th className="py-1 text-left">Seats</th>
              <th className="py-1 text-left">Booking Ref</th>
            </tr>
          </thead>
          <tbody>
            {absenteeRows.map((b) => (
              <tr key={b.id} className="border-b border-neutral-400">
                <td className="py-1">{b.customer_name || "—"}</td>
                <td className="py-1">{b.account_phone || "—"}</td>
                <td className="py-1">{b.account_whatsapp || "—"}</td>
                <td className="py-1">{b.seat_labels || "—"}</td>
                <td className="py-1">#{b.booking_number || b.id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Printable audience report */}
      <div className={`mt-8 ${printMode === "audience" ? "hidden print:block" : "hidden"}`}>
        <h2 className="text-lg font-bold text-black">Audience Report</h2>
        <table className="mt-3 w-full border-collapse text-sm text-black">
          <thead>
            <tr className="border-b border-black">
              <th className="py-1 text-left">Customer</th>
              <th className="py-1 text-left">Movie</th>
              <th className="py-1 text-left">Showtime</th>
              <th className="py-1 text-left">Seats</th>
              <th className="py-1 text-left">No. of Tickets</th>
              <th className="py-1 text-left">Total</th>
              <th className="py-1 text-left">Status</th>
              <th className="py-1 text-left">Attendance</th>
            </tr>
          </thead>
          <tbody>
            {sortedBookings.map((b) => (
              <tr key={b.id} className="border-b border-neutral-400">
                <td className="py-1">{b.customer_name || "—"}</td>
                <td className="py-1">{b.movie_title}</td>
                <td className="py-1">{formatVenueDateTime(b.starts_at)}</td>
                <td className="py-1">{b.seat_labels || "—"}</td>
                <td className="py-1">{ticketCount(b)}</td>
                <td className="py-1">AOA {(b.total_cents / 100).toFixed(2)}</td>
                <td className="py-1">{b.status}</td>
                <td className="py-1">{attendanceLabel(b)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-black font-semibold">
              <td className="py-1" colSpan={4}>
                Grand total
              </td>
              <td className="py-1">{audienceTotals.tickets}</td>
              <td className="py-1">AOA {(audienceTotals.cents / 100).toFixed(2)}</td>
              <td className="py-1" colSpan={2}></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* On-screen reference table */}
      <div className="mt-8 overflow-x-auto rounded-lg border border-neutral-800 print:hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-900 text-neutral-400">
            <tr>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Movie</th>
              <th className="px-4 py-3">Showtime</th>
              <th className="px-4 py-3">Seats</th>
              <th className="px-4 py-3">No. of Tickets</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Attendance</th>
            </tr>
          </thead>
          <tbody>
            {sortedBookings.map((b) => (
              <tr key={b.id} className="border-t border-neutral-800">
                <td className="px-4 py-3">{b.customer_name || "—"}</td>
                <td className="px-4 py-3">{b.movie_title}</td>
                <td className="px-4 py-3 text-neutral-400">
                  {formatVenueDateTime(b.starts_at)}
                </td>
                <td className="px-4 py-3 text-neutral-400">{b.seat_labels || "—"}</td>
                <td className="px-4 py-3 text-neutral-400">{ticketCount(b)}</td>
                <td className="px-4 py-3 text-neutral-400">
                  AOA {(b.total_cents / 100).toFixed(2)}
                </td>
                <td className="px-4 py-3">{b.status}</td>
                <td className="px-4 py-3">
                  {b.checked_in_at ? (
                    <span className="text-green-400">Admitted</span>
                  ) : (
                    <span className="text-neutral-500">Not yet</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          {sortedBookings.length > 0 && (
            <tfoot>
              <tr className="border-t border-neutral-700 font-semibold text-neutral-200">
                <td className="px-4 py-3" colSpan={4}>
                  Grand total
                </td>
                <td className="px-4 py-3">{audienceTotals.tickets}</td>
                <td className="px-4 py-3">AOA {(audienceTotals.cents / 100).toFixed(2)}</td>
                <td className="px-4 py-3" colSpan={2}></td>
              </tr>
            </tfoot>
          )}
        </table>
        {sortedBookings.length === 0 && (
          <div className="p-6 text-center text-neutral-400">No bookings yet.</div>
        )}
      </div>
    </div>
  );
}

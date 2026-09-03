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

  // The audience report still lists every status (so a cancellation is
  // visible in context), but a cancelled booking's seats were released and
  // never actually sold — so its tickets/revenue must not inflate the Grand
  // total. Everything else (paid, pending) still counts.
  const audienceTotals = useMemo(
    () =>
      sortedBookings
        .filter((b) => b.status !== "cancelled")
        .reduce(
          (acc, b) => ({
            tickets: acc.tickets + ticketCount(b),
            cents: acc.cents + b.total_cents,
          }),
          { tickets: 0, cents: 0 }
        ),
    [sortedBookings]
  );

  // Groups the audience report by movie + showtime so that pair is shown
  // once as a section heading instead of being repeated on every row. Built
  // from sortedBookings, so each group's rows stay in ascending Booking Ref
  // order and groups themselves appear in that same order.
  const audienceGroups = useMemo(() => {
    const map = new Map<string, { movieTitle: string; startsAt: string; rows: BookingWithDetails[] }>();
    for (const b of sortedBookings) {
      const key = `${b.movie_title}|${b.starts_at}`;
      if (!map.has(key)) map.set(key, { movieTitle: b.movie_title, startsAt: b.starts_at, rows: [] });
      map.get(key)!.rows.push(b);
    }
    return Array.from(map.values());
  }, [sortedBookings]);

  // Bookings that were edited after the fact (seats and/or ticket count
  // changed post-payment) — flagged with an asterisk next to the name in the
  // audience report, with the actual note explaining what changed listed
  // once below the report.
  const changedBookings = useMemo(
    () => sortedBookings.filter((b) => b.seats_changed_note),
    [sortedBookings]
  );

  function exportAudienceCSV() {
    // Movie + showtime are written once as a section line ahead of each
    // group's own header/rows, rather than repeated on every row.
    const out: string[][] = [];
    for (const group of audienceGroups) {
      out.push([`${group.movieTitle} — ${formatVenueDateTime(group.startsAt)}`]);
      out.push([
        "Customer",
        "Seats",
        "No. of Tickets",
        "Total",
        "Payment",
        "Status",
        "Attendance",
        "Booked At",
        "Notes",
      ]);
      for (const b of group.rows) {
        out.push([
          b.customer_name || "",
          b.seat_labels || "",
          String(ticketCount(b)),
          (b.total_cents / 100).toFixed(2),
          b.payment_terms || "",
          b.status,
          attendanceLabel(b),
          formatVenueDateTime(b.created_at),
          b.seats_changed_note || "",
        ]);
      }
      out.push([]);
    }
    out.push([
      "Grand total (excludes cancelled bookings)",
      "",
      String(audienceTotals.tickets),
      (audienceTotals.cents / 100).toFixed(2),
      "",
      "",
      "",
      "",
      "",
    ]);
    downloadText("audience-report.csv", toCSV(out));
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

      {/* Printable audience report — grouped by movie + showtime so that
          pair is shown once as a section heading instead of on every row. */}
      <div className={`mt-8 ${printMode === "audience" ? "hidden print:block" : "hidden"}`}>
        <h2 className="text-lg font-bold text-black">Audience Report</h2>
        {audienceGroups.map((group) => (
          <div key={`${group.movieTitle}|${group.startsAt}`} className="mt-4">
            <h3 className="text-sm font-semibold text-black">
              {group.movieTitle} — {formatVenueDateTime(group.startsAt)}
            </h3>
            <table className="mt-1 w-full border-collapse text-sm text-black">
              <thead>
                <tr className="border-b border-black">
                  <th className="py-1 text-left">Customer</th>
                  <th className="py-1 text-left">Seats</th>
                  <th className="py-1 text-left">No. of Tickets</th>
                  <th className="py-1 text-left">Total (AOA)</th>
                  <th className="py-1 text-left">Status</th>
                  <th className="py-1 text-left">Attendance</th>
                </tr>
              </thead>
              <tbody>
                {group.rows.map((b) => (
                  <tr
                    key={b.id}
                    className={`border-b border-neutral-400 ${
                      b.status === "cancelled" ? "text-red-600 line-through" : ""
                    }`}
                  >
                    <td className="py-1">
                      {b.customer_name || "—"}
                      {b.seats_changed_note && <sup>*</sup>}
                    </td>
                    <td className="py-1">{b.seat_labels || "—"}</td>
                    <td className="py-1">{ticketCount(b)}</td>
                    <td className="py-1">{(b.total_cents / 100).toFixed(2)}</td>
                    <td className="py-1">{b.status}</td>
                    <td className="py-1">{attendanceLabel(b)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
        <div className="mt-3 flex items-center justify-between border-t-2 border-black pt-2 text-sm font-semibold text-black">
          <span>Grand total (excludes cancelled bookings)</span>
          <span>
            {audienceTotals.tickets} tickets · AOA {(audienceTotals.cents / 100).toFixed(2)}
          </span>
        </div>
        {changedBookings.length > 0 && (
          <div className="mt-3 space-y-0.5 text-xs text-neutral-700">
            {changedBookings.map((b) => (
              <p key={b.id}>
                * {b.customer_name || b.booking_number || b.id}: {b.seats_changed_note}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* On-screen reference table (Audience report) — grouped by movie +
          showtime, shown once per group as a heading rather than repeated
          on every row. */}
      <div className="mt-8 space-y-6 print:hidden">
        {audienceGroups.map((group) => (
          <div
            key={`${group.movieTitle}|${group.startsAt}`}
            className="overflow-x-auto rounded-lg border border-neutral-800"
          >
            <div className="border-b border-neutral-800 bg-neutral-900 px-4 py-2 text-sm font-semibold text-neutral-200">
              {group.movieTitle} — {formatVenueDateTime(group.startsAt)}
            </div>
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-900 text-neutral-400">
                <tr>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Seats</th>
                  <th className="px-4 py-3">No. of Tickets</th>
                  <th className="px-4 py-3">Total (AOA)</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Attendance</th>
                </tr>
              </thead>
              <tbody>
                {group.rows.map((b) => (
                  <tr
                    key={b.id}
                    className={`border-t border-neutral-800 ${
                      b.status === "cancelled" ? "text-red-500 line-through" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      {b.customer_name || "—"}
                      {b.seats_changed_note && <sup>*</sup>}
                    </td>
                    <td className="px-4 py-3 text-neutral-400">{b.seat_labels || "—"}</td>
                    <td className="px-4 py-3 text-neutral-400">{ticketCount(b)}</td>
                    <td className="px-4 py-3 text-neutral-400">
                      {(b.total_cents / 100).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      {/* A plain-text "CANCELLED" badge, not just red + strikethrough —
                          on a small phone screen (glare, a washed-out display, or just
                          not noticing the color) the status needs to read clearly on
                          its own, without depending on perceiving red at all. */}
                      {b.status === "cancelled" ? (
                        <span className="inline-block rounded-full bg-red-950 px-2 py-0.5 text-xs font-semibold tracking-wide text-red-300 no-underline">
                          CANCELLED
                        </span>
                      ) : (
                        b.status
                      )}
                    </td>
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
            </table>
          </div>
        ))}
        {sortedBookings.length > 0 && (
          <div className="flex items-center justify-between rounded-md border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm font-semibold text-neutral-200">
            <span>Grand total (excludes cancelled bookings)</span>
            <span>
              {audienceTotals.tickets} tickets · AOA {(audienceTotals.cents / 100).toFixed(2)}
            </span>
          </div>
        )}
        {changedBookings.length > 0 && (
          <div className="space-y-0.5 text-xs text-neutral-500">
            {changedBookings.map((b) => (
              <p key={b.id}>
                * {b.customer_name || b.booking_number || b.id}: {b.seats_changed_note}
              </p>
            ))}
          </div>
        )}
        {sortedBookings.length === 0 && (
          <div className="rounded-lg border border-neutral-800 p-6 text-center text-neutral-400">
            No bookings yet.
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import type { MovieCustomerList } from "@/lib/data";

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

// The list of people who actually watched this movie (paid bookings only),
// deduped by phone number — ready to contact for a future show (WhatsApp
// campaign, a promo code for the sequel, etc.). See listCustomersForMovie in
// data.ts for how it's built.
export default function MovieCustomersTable({ list }: { list: MovieCustomerList }) {
  function exportCSV() {
    const header = ["Name", "Phone", "WhatsApp", "Bookings", "Tickets", "Last booked"];
    const rows = list.rows.map((r) => [
      r.name || "",
      r.phone,
      r.whatsapp || "",
      String(r.bookings),
      String(r.tickets),
      new Date(r.lastBookedAt).toLocaleDateString(),
    ]);
    const safeTitle = list.movieTitle.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    downloadText(`${safeTitle}-customers.csv`, toCSV([header, ...rows]));
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-neutral-400">
          {list.rows.length} customer{list.rows.length === 1 ? "" : "s"} paid for{" "}
          <span className="text-neutral-200">{list.movieTitle}</span> — contact them here about a
          future show.
        </p>
        <button
          onClick={exportCSV}
          disabled={list.rows.length === 0}
          className="rounded-md bg-neutral-800 px-3 py-1.5 text-sm text-neutral-200 hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Download CSV
        </button>
      </div>

      {list.noPhoneBookings > 0 && (
        <p className="mt-2 text-xs text-neutral-500">
          {list.noPhoneBookings} paid booking{list.noPhoneBookings === 1 ? "" : "s"} for this
          movie {list.noPhoneBookings === 1 ? "has" : "have"} no phone number on file and{" "}
          {list.noPhoneBookings === 1 ? "isn't" : "aren't"} included below.
        </p>
      )}

      <div className="mt-3 overflow-x-auto rounded-lg border border-neutral-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-900 text-neutral-400">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">WhatsApp</th>
              <th className="px-4 py-3">Tickets</th>
              <th className="px-4 py-3">Last booked</th>
            </tr>
          </thead>
          <tbody>
            {list.rows.map((r) => (
              <tr key={r.phone} className="border-t border-neutral-800">
                <td className="px-4 py-3 font-medium">{r.name || "—"}</td>
                <td className="px-4 py-3 text-neutral-400">{r.phone}</td>
                <td className="px-4 py-3 text-neutral-400">{r.whatsapp || "—"}</td>
                <td className="px-4 py-3 text-neutral-400">
                  {r.tickets}
                  {r.bookings > 1 && (
                    <span className="text-neutral-600"> ({r.bookings} bookings)</span>
                  )}
                </td>
                <td className="px-4 py-3 text-neutral-500">
                  {new Date(r.lastBookedAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.rows.length === 0 && (
          <div className="p-6 text-center text-neutral-400">
            No paid, contactable customers for this movie yet.
          </div>
        )}
      </div>
    </div>
  );
}

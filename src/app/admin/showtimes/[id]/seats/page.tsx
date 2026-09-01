import { notFound } from "next/navigation";
import Link from "next/link";
import { getAdminSeatMapForShowtime, getShowtime } from "@/lib/data";
import { formatVenueDateTime } from "@/lib/timezone";

// Read-only visual booking layout for one showtime — the actual seat grid
// (same shape the customer sees) colored by status, with the customer name
// and booking reference on each occupied seat. This is what was missing
// from the admin portal: the Bookings table only lists bookings as text
// rows ("Seats: A3, A4"), with no way to see the whole screen at a glance —
// who's sitting where, and which seats are still open.
export default async function AdminShowtimeSeatsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [showtime, seats] = await Promise.all([
    getShowtime(id),
    getAdminSeatMapForShowtime(id),
  ]);
  if (!showtime) notFound();

  const rowMap = new Map<string, typeof seats>();
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
  const availableCount = seats.filter((s) => s.status === "available").length;

  return (
    <div>
      <Link href="/admin/showtimes" className="text-sm text-neutral-400 hover:text-neutral-200">
        ← Back to Showtimes
      </Link>
      <h1 className="mt-2 text-2xl font-bold">
        {showtime.movie_title} — {showtime.screen_name}
      </h1>
      <p className="text-sm text-neutral-500">{formatVenueDateTime(showtime.starts_at)}</p>

      <div className="mt-4 flex flex-wrap gap-4 text-sm text-neutral-400">
        <span>
          <span className="font-medium text-red-300">{bookedCount}</span> booked
        </span>
        <span>
          <span className="font-medium text-green-300">{heldCount}</span> held (payment pending)
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
                      const title =
                        seat.status === "available"
                          ? `${rowLabel}${seat.col_number} — available`
                          : `${rowLabel}${seat.col_number} — ${
                              seat.status === "held" ? "held, payment pending" : "booked"
                            }${seat.customer_name ? ` — ${seat.customer_name}` : ""}${
                              seat.booking_number ? ` (#${seat.booking_number})` : ""
                            }${seat.checked_in_at ? " — admitted" : ""}`;
                      const seatEl = (
                        <div
                          title={title}
                          style={{ gridColumnStart: seat.col_number }}
                          className={[
                            "flex h-7 w-7 items-center justify-center rounded-t-md text-[9px] font-medium leading-none",
                            seat.status === "booked"
                              ? "bg-red-900 text-red-200"
                              : seat.status === "held"
                              ? "bg-green-800 text-green-200"
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
                        <div key={seat.id}

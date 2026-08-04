import { listAllBookings } from "@/lib/data";

export default async function AdminBookingsPage() {
  const bookings = await listAllBookings();

  return (
    <div>
      <h1 className="text-2xl font-bold">Bookings</h1>

      <div className="mt-6 overflow-x-auto rounded-lg border border-neutral-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-900 text-neutral-400">
            <tr>
              <th className="px-4 py-3">Movie</th>
              <th className="px-4 py-3">Showtime</th>
              <th className="px-4 py-3">Seats</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Booked</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id} className="border-t border-neutral-800">
                <td className="px-4 py-3">{b.movie_title}</td>
                <td className="px-4 py-3 text-neutral-400">
                  {new Date(b.starts_at).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-neutral-400">{b.seat_labels || "—"}</td>
                <td className="px-4 py-3">${(b.total_cents / 100).toFixed(2)}</td>
                <td className="px-4 py-3">
                  <span
                    className={[
                      "rounded-full px-2 py-0.5 text-xs",
                      b.status === "paid"
                        ? "bg-green-900 text-green-300"
                        : b.status === "cancelled"
                        ? "bg-neutral-800 text-neutral-400"
                        : "bg-yellow-900 text-yellow-300",
                    ].join(" ")}
                  >
                    {b.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-neutral-500">
                  {new Date(b.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {bookings.length === 0 && (
          <div className="p-6 text-center text-neutral-400">No bookings yet.</div>
        )}
      </div>
    </div>
  );
}

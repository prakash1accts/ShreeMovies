import Link from "next/link";
import { listAllBookings, listMovies, listAllShowtimes } from "@/lib/data";

export default async function AdminOverviewPage() {
  const [movies, showtimes, bookings] = await Promise.all([
    listMovies(),
    listAllShowtimes(),
    listAllBookings(),
  ]);
  const paidBookings = bookings.filter((b) => b.status === "paid");
  const revenueCents = paidBookings.reduce((sum, b) => sum + b.total_cents, 0);

  const stats = [
    { label: "Movies", value: movies.length, href: "/admin/movies" },
    { label: "Showtimes", value: showtimes.length, href: "/admin/showtimes" },
    { label: "Paid bookings", value: paidBookings.length, href: "/admin/bookings" },
    { label: "Revenue", value: `AOA ${(revenueCents / 100).toFixed(2)}`, href: "/admin/bookings" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold">Admin Overview</h1>
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 hover:border-neutral-600"
          >
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-sm text-neutral-400">{s.label}</div>
          </Link>
        ))}
      </div>

      <div className="mt-8 rounded-lg border border-neutral-800 bg-neutral-900 p-5">
        <h2 className="font-semibold">Quick start</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-neutral-400">
          <li>Add a movie under Movies.</li>
          <li>Schedule showtimes for it under Showtimes.</li>
          <li>Customers can then browse and book seats from the homepage.</li>
        </ol>
      </div>
    </div>
  );
}

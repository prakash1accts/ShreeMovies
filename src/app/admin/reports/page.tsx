import { listAllBookings, listAllShowtimes, listMovies } from "@/lib/data";
import ReportsClient from "@/components/ReportsClient";

export default async function AdminReportsPage() {
  const [bookings, showtimes, movies] = await Promise.all([
    listAllBookings(),
    listAllShowtimes(),
    listMovies(),
  ]);

  return <ReportsClient bookings={bookings} showtimes={showtimes} movies={movies} />;
}

import { listAllBookings, listAllShowtimes } from "@/lib/data";
import ReportsClient from "@/components/ReportsClient";

export default async function AdminReportsPage() {
  const [bookings, showtimes] = await Promise.all([listAllBookings(), listAllShowtimes()]);

  return <ReportsClient bookings={bookings} showtimes={showtimes} />;
}

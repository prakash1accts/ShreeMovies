import Link from "next/link";
import { cancelBooking, getBooking } from "@/lib/data";

export default async function BookingCancelPage({
  searchParams,
}: {
  searchParams: Promise<{ booking?: string }>;
}) {
  const { booking: bookingId } = await searchParams;
  const booking = bookingId ? await getBooking(bookingId) : undefined;

  if (booking && booking.status === "pending") {
    await cancelBooking(booking.id);
  }

  return (
    <div className="mx-auto max-w-md text-center">
      <div className="text-4xl">✋</div>
      <h1 className="mt-4 text-2xl font-bold">Checkout cancelled</h1>
      <p className="mt-2 text-neutral-400">
        Your seats have been released. No payment was taken.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-md bg-neutral-800 px-4 py-2 font-medium text-white hover:bg-neutral-700"
      >
        Back to movies
      </Link>
    </div>
  );
}

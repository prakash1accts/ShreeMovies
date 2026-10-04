import { listAllCustomers, listCustomersForMovie, listMovies } from "@/lib/data";
import CustomersMovieFilter from "@/components/CustomersMovieFilter";
import MovieCustomersTable from "@/components/MovieCustomersTable";

// The master phone -> name directory (see the `Customer` type and
// upsertCustomer() in data.ts) — every number captured from an admin
// walk-in booking, an Edit Booking save, or an online signup lands here,
// regardless of whether that person also has a login account. This is
// deliberately separate from Admin -> Users, which only lists registered
// online accounts (email + password).
//
// ?movieId=<id> switches this page over to the "who watched this movie"
// view (listCustomersForMovie) — paid bookings for that movie only, deduped
// by phone — so the people who actually came can be contacted about a
// future show. See CustomersMovieFilter.tsx for the dropdown that sets it.
export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ movieId?: string }>;
}) {
  const { movieId } = await searchParams;
  const [customers, movies, movieCustomers] = await Promise.all([
    listAllCustomers(),
    listMovies(),
    movieId ? listCustomersForMovie(movieId) : Promise.resolve(undefined),
  ]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Customers</h1>
          <p className="mt-1 text-neutral-400">
            {movieCustomers
              ? "Who actually watched this movie (paid bookings), so you can reach them about a future show."
              : "The master phone number → name directory. Every walk-in sale, booking edit, or online signup that captures a phone number adds or updates an entry here — this is what powers the autofill when that same number is used again for a future booking."}
          </p>
        </div>
        <CustomersMovieFilter movies={movies} selectedMovieId={movieId} />
      </div>

      {movieCustomers ? (
        <div className="mt-6">
          <MovieCustomersTable list={movieCustomers} />
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-neutral-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-900 text-neutral-400">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">WhatsApp</th>
                <th className="px-4 py-3">Last updated</th>
                <th className="px-4 py-3">First seen</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="border-t border-neutral-800">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-neutral-400">{c.phone}</td>
                  <td className="px-4 py-3 text-neutral-400">{c.whatsapp || "—"}</td>
                  <td className="px-4 py-3 text-neutral-500">
                    {new Date(c.updated_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-neutral-500">
                    {new Date(c.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {customers.length === 0 && (
            <div className="p-6 text-center text-neutral-400">
              No customers yet — one gets added here the next time a phone number is entered on a
              walk-in booking, an Edit Booking save, or an online signup.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

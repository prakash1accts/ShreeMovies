import { deleteShowtimeAction, ensureDefaultTheaterAndScreen } from "@/app/actions/admin";
import { listAllShowtimes, listMovies, listScreens } from "@/lib/data";
import AdminShowtimeForm from "@/components/AdminShowtimeForm";

export default async function AdminShowtimesPage() {
  await ensureDefaultTheaterAndScreen();

  const [movies, screens, showtimes] = await Promise.all([
    listMovies(),
    listScreens(),
    listAllShowtimes(),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold">Showtimes</h1>

      <div className="mt-6">
        <AdminShowtimeForm movies={movies} screens={screens} />
      </div>

      <div className="mt-8 space-y-3">
        {showtimes.map((st) => (
          <div
            key={st.id}
            className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900 p-4"
          >
            <div>
              <div className="font-medium">{st.movie_title}</div>
              <div className="text-sm text-neutral-500">
                {new Date(st.starts_at).toLocaleString()} · {st.screen_name} · $
                {(st.price_cents / 100).toFixed(2)}
              </div>
            </div>
            <form action={deleteShowtimeAction}>
              <input type="hidden" name="id" value={st.id} />
              <button className="rounded-md bg-neutral-800 px-3 py-1.5 text-sm text-neutral-300 hover:bg-red-900 hover:text-red-300">
                Delete
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}

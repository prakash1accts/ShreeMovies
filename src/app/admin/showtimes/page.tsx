import Link from "next/link";
import {
  deleteShowtimeAction,
  ensureDefaultTheaterAndScreen,
  resyncShowtimeSeatsAction,
} from "@/app/actions/admin";
import {
  getAdmissionStatsForShowtimes,
  getShowtimeSeatSyncStatus,
  listAllShowtimes,
  listMovies,
  listScreens,
} from "@/lib/data";
import AdminShowtimeForm from "@/components/AdminShowtimeForm";
import { formatVenueDateTime } from "@/lib/timezone";

export default async function AdminShowtimesPage() {
  await ensureDefaultTheaterAndScreen();

  const [movies, screens, showtimes] = await Promise.all([
    listMovies(),
    listScreens(),
    listAllShowtimes(),
  ]);
  const screensById = new Map(screens.map((sc) => [sc.id, sc]));

  // A showtime's seat grid is a snapshot taken when it was created, so if a
  // screen's layout was changed afterward (e.g. loading the real Screen 7
  // chart), older showtimes on that screen keep the stale grid until
  // resynced. Flag each one here rather than making the admin guess.
  const syncStatuses = await Promise.all(
    showtimes.map((st) => {
      const screen = screensById.get(st.screen_id);
      return screen ? getShowtimeSeatSyncStatus(st.id, screen) : null;
    })
  );

  // "X / Y admitted" per showtime, from ticket QR scans at the door — one
  // batched query for every showtime on this page rather than one per row.
  const admissionStats = await getAdmissionStatsForShowtimes(showtimes.map((st) => st.id));

  return (
    <div>
      <h1 className="text-2xl font-bold">Showtimes</h1>

      <div className="mt-6">
        <AdminShowtimeForm movies={movies} screens={screens} />
      </div>

      <div className="mt-8 space-y-3">
        {showtimes.map((st, i) => {
          const sync = syncStatuses[i];
          const outOfSync = sync ? !sync.inSync : false;
          const canResync = outOfSync && sync!.bookedOrHeldCount === 0;
          const admission = admissionStats[st.id];

          return (
            <div
              key={st.id}
              className="rounded-lg border border-neutral-800 bg-neutral-900 p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{st.movie_title}</div>
                  <div className="text-sm text-neutral-500">
                    {formatVenueDateTime(st.starts_at)} · {st.screen_name} · AOA{" "}
                    {(st.price_cents / 100).toFixed(2)}
                  </div>
                  {admission && admission.total > 0 && (
                    <div className="mt-1 text-sm text-neutral-400">
                      🎟️ {admission.admitted} / {admission.total} admitted
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/admin/showtimes/${st.id}/edit`}
                    className="rounded-md bg-neutral-800 px-3 py-1.5 text-sm text-neutral-300 hover:bg-neutral-700"
                  >
                    Edit
                  </Link>
                  {canResync && (
                    <form action={resyncShowtimeSeatsAction}>
                      <input type="hidden" name="id" value={st.id} />
                      <button className="rounded-md bg-amber-900/50 px-3 py-1.5 text-sm text-amber-300 hover:bg-amber-800/60">
                        Refresh seat map
                      </button>
                    </form>
                  )}
                  <form action={deleteShowtimeAction}>
                    <input type="hidden" name="id" value={st.id} />
                    <button className="rounded-md bg-neutral-800 px-3 py-1.5 text-sm text-neutral-300 hover:bg-red-900 hover:text-red-300">
                      Delete
                    </button>
                  </form>
                </div>
              </div>
              {outOfSync && (
                <p className="mt-2 text-xs text-amber-400">
                  {canResync
                    ? `This showtime's seat map is out of date with ${st.screen_name}'s current layout — click "Refresh seat map" to update it (no tickets have been sold for it yet, so this is safe).`
                    : `This showtime's seat map is out of date with ${st.screen_name}'s current layout, but it already has ${sync!.bookedOrHeldCount} seat(s) booked or held — delete and recreate this showtime instead if you need the new layout, since refreshing would lose those.`}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

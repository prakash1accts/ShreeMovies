import Link from "next/link";
import {
  closeShowtimeAction,
  deleteShowtimeAction,
  ensureDefaultTheaterAndScreen,
  reopenShowtimeAction,
  resyncShowtimeSeatsAction,
} from "@/app/actions/admin";
import {
  getAdmissionStatsForShowtimes,
  getShowtimeSeatSyncStatus,
  listActiveShowtimes,
  listClosedShowtimes,
  listMovies,
  listScreens,
} from "@/lib/data";
import AdminShowtimeForm from "@/components/AdminShowtimeForm";
import { formatVenueDateTime } from "@/lib/timezone";

export default async function AdminShowtimesPage() {
  await ensureDefaultTheaterAndScreen();

  const [movies, screens, showtimes, closedShowtimes] = await Promise.all([
    listMovies(),
    listScreens(),
    listActiveShowtimes(),
    listClosedShowtimes(),
  ]);
  const screensById = new Map(screens.map((sc) => [sc.id, sc]));

  // A showtime's seat grid is a snapshot taken when it was created, so if a
  // screen's layout was changed afterward (e.g. loading the real Screen 7
  // chart), older showtimes on that screen keep the stale grid until
  // resynced. Flag each one here rather than making the admin guess. Only
  // meaningful for active showtimes — a closed one's seat map is never
  // touched again.
  const syncStatuses = await Promise.all(
    showtimes.map((st) => {
      const screen = screensById.get(st.screen_id);
      return screen ? getShowtimeSeatSyncStatus(st.id, screen) : null;
    })
  );

  // "X / Y admitted" per showtime, from ticket QR scans at the door — one
  // batched query covering both active and closed showtimes, so the closed
  // section below can still show its final ticket count.
  const admissionStats = await getAdmissionStatsForShowtimes([
    ...showtimes.map((st) => st.id),
    ...closedShowtimes.map((st) => st.id),
  ]);

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
                      {new Date(st.starts_at) < new Date() &&
                        admission.admitted < admission.total && (
                          <Link
                            href="/admin/reports"
                            className="ml-2 text-amber-400 hover:text-amber-300"
                          >
                            ⚠ {admission.total - admission.admitted} not yet admitted — see
                            absentee report
                          </Link>
                        )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/admin/showtimes/${st.id}/seats`}
                    className="rounded-md bg-neutral-800 px-3 py-1.5 text-sm text-neutral-300 hover:bg-neutral-700"
                  >
                    Seat map
                  </Link>
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
                  <form action={closeShowtimeAction}>
                    <input type="hidden" name="id" value={st.id} />
                    <input type="hidden" name="movieId" value={st.movie_id} />
                    <button className="rounded-md bg-neutral-800 px-3 py-1.5 text-sm text-neutral-300 hover:bg-amber-900 hover:text-amber-300">
                      Close show
                    </button>
                  </form>
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
        {showtimes.length === 0 && (
          <div className="rounded-lg border border-neutral-800 p-6 text-center text-neutral-400">
            No active showtimes. Add one above.
          </div>
        )}
      </div>

      {closedShowtimes.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-semibold text-neutral-300">
            Closed shows ({closedShowtimes.length})
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            Done screenings — hidden from the homepage, movie pages, and new walk-in bookings.
            Their booking references and ticket counts are untouched and still available in
            Reports; reopen one here if it was closed by mistake or needs a late sale.
          </p>
          <div className="mt-3 space-y-2">
            {closedShowtimes.map((st) => {
              const admission = admissionStats[st.id];
              return (
                <div
                  key={st.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-800 bg-neutral-900/60 p-4"
                >
                  <div>
                    <div className="font-medium text-neutral-300">{st.movie_title}</div>
                    <div className="text-sm text-neutral-500">
                      {formatVenueDateTime(st.starts_at)} · {st.screen_name}
                      {admission && admission.total > 0 && (
                        <> · 🎟️ {admission.admitted} / {admission.total} admitted</>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href="/admin/reports"
                      className="rounded-md bg-neutral-800 px-3 py-1.5 text-sm text-neutral-300 hover:bg-neutral-700"
                    >
                      View in Reports
                    </Link>
                    <form action={reopenShowtimeAction}>
                      <input type="hidden" name="id" value={st.id} />
                      <input type="hidden" name="movieId" value={st.movie_id} />
                      <button className="rounded-md bg-neutral-800 px-3 py-1.5 text-sm text-neutral-300 hover:bg-green-900 hover:text-green-300">
                        Reopen
                      </button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

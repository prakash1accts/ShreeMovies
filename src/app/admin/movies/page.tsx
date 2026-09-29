import Link from "next/link";
import {
  archiveMovieAction,
  deleteMovieAction,
  unarchiveMovieAction,
} from "@/app/actions/admin";
import { getMovie, listMovies } from "@/lib/data";
import AdminMovieForm from "@/components/AdminMovieForm";

export default async function AdminMoviesPage({
  searchParams,
}: {
  searchParams: Promise<{ deleteError?: string }>;
}) {
  const { deleteError } = await searchParams;
  const [movies, blockedMovie] = await Promise.all([
    listMovies(),
    deleteError ? getMovie(deleteError) : Promise.resolve(undefined),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold">Movies</h1>

      {blockedMovie && (
        <div className="mt-4 rounded-lg border border-yellow-800 bg-yellow-950/40 p-4 text-sm text-yellow-200">
          &ldquo;{blockedMovie.title}&rdquo; can&apos;t be deleted — it still has bookings, and
          deleting a movie permanently erases all of its showtimes, seats, and booking/revenue
          history. Use <strong>Archive</strong> instead to hide it from the site (or close its
          individual showtimes) without losing that history.
        </div>
      )}

      <div className="mt-6">
        <AdminMovieForm />
      </div>

      <div className="mt-8 space-y-3">
        {movies.map((movie) => (
          <div
            key={movie.id}
            className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900 p-4"
          >
            <div>
              <div className="flex items-center gap-2 font-medium">
                {movie.title}
                {movie.archived_at && (
                  <span className="rounded bg-neutral-800 px-1.5 py-0.5 text-xs font-normal text-neutral-400">
                    Archived
                  </span>
                )}
              </div>
              <div className="text-sm text-neutral-500">
                {[movie.genre, movie.rating, `${movie.duration_minutes} min`]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/admin/movies/${movie.id}/edit`}
                className="rounded-md bg-neutral-800 px-3 py-1.5 text-sm text-neutral-300 hover:bg-neutral-700"
              >
                Edit
              </Link>
              {movie.archived_at ? (
                <form action={unarchiveMovieAction}>
                  <input type="hidden" name="id" value={movie.id} />
                  <button className="rounded-md bg-neutral-800 px-3 py-1.5 text-sm text-neutral-300 hover:bg-neutral-700">
                    Unarchive
                  </button>
                </form>
              ) : (
                <form action={archiveMovieAction}>
                  <input type="hidden" name="id" value={movie.id} />
                  <button className="rounded-md bg-neutral-800 px-3 py-1.5 text-sm text-neutral-300 hover:bg-neutral-700">
                    Archive
                  </button>
                </form>
              )}
              <form action={deleteMovieAction}>
                <input type="hidden" name="id" value={movie.id} />
                <button className="rounded-md bg-neutral-800 px-3 py-1.5 text-sm text-neutral-300 hover:bg-red-900 hover:text-red-300">
                  Delete
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

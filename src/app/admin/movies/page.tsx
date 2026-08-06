import Link from "next/link";
import { deleteMovieAction } from "@/app/actions/admin";
import { listMovies } from "@/lib/data";
import AdminMovieForm from "@/components/AdminMovieForm";

export default async function AdminMoviesPage() {
  const movies = await listMovies();

  return (
    <div>
      <h1 className="text-2xl font-bold">Movies</h1>

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
              <div className="font-medium">{movie.title}</div>
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

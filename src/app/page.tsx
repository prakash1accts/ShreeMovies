import Link from "next/link";
import { listMovies, listMoviesByLanguage } from "@/lib/data";
import PosterImage from "@/components/PosterImage";
import PosterMarquee from "@/components/PosterMarquee";

export default async function HomePage() {
  const [movies, hindiMovies, tamilMovies] = await Promise.all([
    listMovies(),
    listMoviesByLanguage("Hindi", 5),
    listMoviesByLanguage("Tamil", 5),
  ]);

  return (
    <div className="flex gap-8">
      <PosterMarquee hindiMovies={hindiMovies} tamilMovies={tamilMovies} />

      <div className="min-w-0 flex-1">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Now Showing</h1>
          <p className="mt-1 text-neutral-400">
            Pick a movie to see showtimes and book your seats.
          </p>
        </div>

        {movies.length === 0 ? (
          <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-8 text-center text-neutral-400">
            No movies yet. An admin can add movies from the Admin dashboard.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {movies.map((movie) => (
              <Link
                key={movie.id}
                href={`/movies/${movie.id}`}
                className="group overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900 transition hover:border-neutral-600"
              >
                <div className="aspect-[2/3] w-full overflow-hidden bg-neutral-800">
                  <PosterImage
                    src={movie.poster_url}
                    alt={movie.title}
                    className="h-full w-full object-cover transition group-hover:scale-105"
                  />
                </div>
                <div className="p-4">
                  <h2 className="font-semibold">{movie.title}</h2>
                  <p className="mt-1 text-sm text-neutral-400">
                    {[movie.genre, movie.rating, `${movie.duration_minutes} min`]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

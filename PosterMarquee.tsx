import Link from "next/link";
import type { Movie } from "@/lib/types";
import PosterImage from "@/components/PosterImage";

function MarqueeTrack({ movies }: { movies: Movie[] }) {
  if (movies.length === 0) return null;

  // Duplicate the list so the CSS animation can loop seamlessly.
  const looped = [...movies, ...movies];

  return (
    <div className="group relative overflow-hidden">
      <div className="poster-marquee-track flex flex-col gap-3">
        {looped.map((movie, i) => (
          <Link
            key={`${movie.id}-${i}`}
            href={`/movies/${movie.id}`}
            className="block w-28 shrink-0 overflow-hidden rounded-md border border-neutral-800 bg-neutral-900 transition hover:border-red-500 sm:w-32"
            title={movie.title}
          >
            <div className="aspect-[2/3] w-full overflow-hidden">
              <PosterImage
                src={movie.poster_url}
                alt={movie.title}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="truncate px-2 py-1.5 text-xs text-neutral-300">
              {movie.title}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function PosterMarquee({
  hindiMovies,
  tamilMovies,
}: {
  hindiMovies: Movie[];
  tamilMovies: Movie[];
}) {
  if (hindiMovies.length === 0 && tamilMovies.length === 0) return null;

  return (
    <aside className="hidden w-36 shrink-0 sm:block lg:w-40">
      <div className="sticky top-6 space-y-6">
        {hindiMovies.length > 0 && (
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Bollywood
            </h3>
            <div className="h-[420px] overflow-hidden rounded-md">
              <MarqueeTrack movies={hindiMovies} />
            </div>
          </div>
        )}
        {tamilMovies.length > 0 && (
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Tamil
            </h3>
            <div className="h-[420px] overflow-hidden rounded-md">
              <MarqueeTrack movies={tamilMovies} />
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

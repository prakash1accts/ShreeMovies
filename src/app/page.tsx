import Link from "next/link";
import {
  getVoteCountsForMovies,
  getVoterVotes,
  listMovies,
  listMoviesByLanguage,
  listUpcomingShowtimes,
} from "@/lib/data";
import { getVoterKey } from "@/lib/voter";
import { voteMovieAction } from "@/app/actions/votes";
import PosterImage from "@/components/PosterImage";
import PosterMarquee from "@/components/PosterMarquee";
import type { Movie, MovieVoteCounts, VoteValue } from "@/lib/types";

export default async function HomePage() {
  const [movies, hindiMovies, tamilMovies, upcomingShowtimes] = await Promise.all([
    listMovies(),
    listMoviesByLanguage("Hindi", 5),
    listMoviesByLanguage("Tamil", 5),
    listUpcomingShowtimes(),
  ]);

  const movieIds = movies.map((m) => m.id);
  const voterKey = await getVoterKey();
  const [voteCounts, myVotes] = await Promise.all([
    getVoteCountsForMovies(movieIds),
    voterKey
      ? getVoterVotes(voterKey, movieIds)
      : Promise.resolve<Record<string, VoteValue>>({}),
  ]);

  // A movie is "Now Showing" once it has at least one showtime scheduled
  // that hasn't happened yet; otherwise it's on the site but not bookable,
  // so it reads as "Coming Soon" instead.
  const moviesWithShowtimes = new Set(upcomingShowtimes.map((st) => st.movie_id));

  // Bookable movies come first on the page (in their own grid), with
  // not-yet-scheduled movies pushed into a separate "Coming Soon" section
  // further down — so customers land straight on something they can
  // actually buy a ticket for, instead of scrolling past unscheduled titles.
  const nowShowingMovies = movies.filter((m) => moviesWithShowtimes.has(m.id));
  const comingSoonMovies = movies.filter((m) => !moviesWithShowtimes.has(m.id));

  return (
    <div className="relative">
      {/* Blurred backdrop shown behind the whole homepage — the same warm,
          welcoming photo visitors see before they've signed up. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 bg-cover bg-center opacity-25 blur-2xl"
        style={{ backgroundImage: "url(/images/homepage-bg.jpg)" }}
      />
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 bg-neutral-950/60" />

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
            <>
              {nowShowingMovies.length > 0 && (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {nowShowingMovies.map((movie) => (
                    <MovieCard
                      key={movie.id}
                      movie={movie}
                      isShowing
                      counts={voteCounts[movie.id] || { up: 0, down: 0 }}
                      myVote={myVotes[movie.id]}
                    />
                  ))}
                </div>
              )}

              {comingSoonMovies.length > 0 && (
                // Extra top margin + a divider gives this section real
                // breathing room below "Now Showing", so customers land on
                // bookable movies first and don't have to hunt for them.
                <div className="mt-12 border-t border-neutral-800 pt-8">
                  <h2 className="text-xl font-semibold text-neutral-300">Coming Soon</h2>
                  <p className="mt-1 text-sm text-neutral-500">
                    Not scheduled yet — vote to let us know you&apos;re interested.
                  </p>
                  <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {comingSoonMovies.map((movie) => (
                      <MovieCard
                        key={movie.id}
                        movie={movie}
                        isShowing={false}
                        counts={voteCounts[movie.id] || { up: 0, down: 0 }}
                        myVote={myVotes[movie.id]}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function MovieCard({
  movie,
  isShowing,
  counts,
  myVote,
}: {
  movie: Movie;
  isShowing: boolean;
  counts: MovieVoteCounts;
  myVote: VoteValue | undefined;
}) {
  return (
    <div className="group overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900 transition hover:border-neutral-600">
      <Link href={`/movies/${movie.id}`} className="block">
        <div className="relative aspect-[2/3] w-full overflow-hidden bg-neutral-800">
          <span
            className={[
              "absolute left-2 top-2 z-10 rounded-full px-2 py-0.5 text-xs font-medium shadow",
              isShowing ? "bg-red-600 text-white" : "bg-neutral-950/80 text-neutral-300",
            ].join(" ")}
          >
            {isShowing ? "Now Showing" : "Coming Soon"}
          </span>
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

      {!isShowing && (
        <div className="flex items-center justify-between gap-2 border-t border-neutral-800 px-4 py-2">
          <span className="text-xs text-neutral-500">Interested in this?</span>
          <div className="flex gap-1.5">
            <form action={voteMovieAction}>
              <input type="hidden" name="movieId" value={movie.id} />
              <input type="hidden" name="vote" value="up" />
              <button
                className={[
                  "flex items-center gap-1 rounded-md px-2 py-1 text-xs transition",
                  myVote === "up"
                    ? "bg-green-600 text-white"
                    : "bg-neutral-800 text-green-400 hover:bg-green-900/50",
                ].join(" ")}
              >
                👍 {counts.up}
              </button>
            </form>
            <form action={voteMovieAction}>
              <input type="hidden" name="movieId" value={movie.id} />
              <input type="hidden" name="vote" value="down" />
              <button
                className={[
                  "flex items-center gap-1 rounded-md px-2 py-1 text-xs transition",
                  myVote === "down"
                    ? "bg-red-600 text-white"
                    : "bg-neutral-800 text-red-400 hover:bg-red-900/50",
                ].join(" ")}
              >
                👎 {counts.down}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

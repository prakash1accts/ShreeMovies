import Link from "next/link";
import { notFound } from "next/navigation";
import { getMovie, listShowtimesForMovie } from "@/lib/data";
import PosterImage from "@/components/PosterImage";

export default async function MovieDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const movie = await getMovie(id);
  if (!movie) notFound();

  const showtimes = await listShowtimesForMovie(id);

  // Group showtimes by calendar day for a cleaner layout
  const byDay = new Map<string, typeof showtimes>();
  for (const st of showtimes) {
    const day = new Date(st.starts_at).toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day)!.push(st);
  }

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
      <div className="md:col-span-1">
        <div className="aspect-[2/3] w-full overflow-hidden rounded-lg bg-neutral-800">
          <PosterImage
            src={movie.poster_url}
            alt={movie.title}
            className="h-full w-full object-cover"
          />
        </div>
      </div>

      <div className="md:col-span-2">
        <h1 className="text-3xl font-bold">{movie.title}</h1>
        <p className="mt-1 text-neutral-400">
          {[
            movie.duration_minutes ? `${movie.duration_minutes} min` : null,
            movie.genre,
            movie.rating,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>

        {movie.language && (
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1 text-xs text-neutral-300">
              {movie.language}
            </span>
          </div>
        )}

        {showtimes.length > 0 && (
          
            <ahref="#showtimes"
            className="mt-5 inline-block rounded-md border border-red-600 px-5 py-2 text-sm font-medium text-red-500 transition hover:bg-red-600 hover:text-white"
          >
            Book tickets
          </a>
        )}

        {movie.description && (
          <>
            <hr className="mt-6 border-neutral-800" />
            <h2 className="mt-6 text-lg font-semibold">About the movie</h2>
            <p className="mt-2 leading-relaxed text-neutral-300">{movie.description}</p>
          </>
        )}

        <h2 id="showtimes" className="mt-8 text-xl font-semibold">
          Showtimes
        </h2>
        {showtimes.length === 0 ? (
          <p className="mt-2 text-neutral-400">No showtimes scheduled yet.</p>
        ) : (
          <div className="mt-4 space-y-6">
            {Array.from(byDay.entries()).map(([day, times]) => (
              <div key={day}>
                <div className="mb-2 text-sm font-medium text-neutral-400">{day}</div>
                <div className="flex flex-wrap gap-2">
                  {times.map((st) => (
                    <Link
                      key={st.id}
                      href={`/showtimes/${st.id}`}
                      className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm hover:border-red-500 hover:text-red-400"
                    >
                      {new Date(st.starts_at).toLocaleTimeString(undefined, {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                      <span className="ml-2 text-neutral-500">{st.screen_name}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

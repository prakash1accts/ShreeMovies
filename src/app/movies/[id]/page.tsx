import Link from "next/link";
import { notFound } from "next/navigation";
import { getMovie, listShowtimesForMovie } from "@/lib/data";

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
          {movie.poster_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={movie.poster_url}
              alt={movie.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-neutral-600">
              No poster
            </div>
          )}
        </div>
      </div>

      <div className="md:col-span-2">
        <h1 className="text-3xl font-bold">{movie.title}</h1>
        <p className="mt-1 text-neutral-400">
          {[movie.genre, movie.rating, `${movie.duration_minutes} min`]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {movie.description && (
          <p className="mt-4 leading-relaxed text-neutral-300">{movie.description}</p>
        )}

        <h2 className="mt-8 text-xl font-semibold">Showtimes</h2>
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

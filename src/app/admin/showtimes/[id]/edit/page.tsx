import { notFound } from "next/navigation";
import Link from "next/link";
import { getShowtime, listMovies, listScreens } from "@/lib/data";
import AdminShowtimeForm from "@/components/AdminShowtimeForm";

export default async function EditShowtimePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const showtime = await getShowtime(id);
  if (!showtime) notFound();

  const [movies, screens] = await Promise.all([listMovies(), listScreens()]);

  return (
    <div>
      <Link
        href="/admin/showtimes"
        className="text-sm text-neutral-400 hover:text-neutral-200"
      >
        ← Back to Showtimes
      </Link>
      <h1 className="mt-2 text-2xl font-bold">
        Edit {showtime.movie_title} — {showtime.screen_name}
      </h1>

      <div className="mt-6">
        <AdminShowtimeForm movies={movies} screens={screens} showtime={showtime} />
      </div>
    </div>
  );
}

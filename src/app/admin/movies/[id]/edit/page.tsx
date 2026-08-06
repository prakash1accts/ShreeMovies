import { notFound } from "next/navigation";
import Link from "next/link";
import { getMovie } from "@/lib/data";
import AdminMovieForm from "@/components/AdminMovieForm";

export default async function EditMoviePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const movie = await getMovie(id);
  if (!movie) notFound();

  return (
    <div>
      <Link
        href="/admin/movies"
        className="text-sm text-neutral-400 hover:text-neutral-200"
      >
        ← Back to Movies
      </Link>
      <h1 className="mt-2 text-2xl font-bold">Edit {movie.title}</h1>

      <div className="mt-6">
        <AdminMovieForm movie={movie} />
      </div>
    </div>
  );
}

import { notFound } from "next/navigation";
import { getMovieSettlement, getMovieSettlementCosts } from "@/lib/data";
import AdminMovieSettlement from "@/components/AdminMovieSettlement";

export default async function AdminMovieSettlementPage({
  params,
}: {
  params: Promise<{ movieId: string }>;
}) {
  const { movieId } = await params;

  const [settlement, costs] = await Promise.all([
    getMovieSettlement(movieId),
    getMovieSettlementCosts(movieId),
  ]);
  if (!settlement) notFound();

  return <AdminMovieSettlement settlement={settlement} costs={costs} />;
}

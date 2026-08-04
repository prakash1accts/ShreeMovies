import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login?next=/admin");
  if (session.role !== "admin") redirect("/");

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-2 border-b border-neutral-800 pb-4">
        <Link
          href="/admin"
          className="rounded-md px-3 py-1.5 text-sm text-neutral-300 hover:bg-neutral-800"
        >
          Overview
        </Link>
        <Link
          href="/admin/movies"
          className="rounded-md px-3 py-1.5 text-sm text-neutral-300 hover:bg-neutral-800"
        >
          Movies
        </Link>
        <Link
          href="/admin/showtimes"
          className="rounded-md px-3 py-1.5 text-sm text-neutral-300 hover:bg-neutral-800"
        >
          Showtimes
        </Link>
        <Link
          href="/admin/bookings"
          className="rounded-md px-3 py-1.5 text-sm text-neutral-300 hover:bg-neutral-800"
        >
          Bookings
        </Link>
      </div>
      {children}
    </div>
  );
}

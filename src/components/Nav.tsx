import Link from "next/link";
import type { SessionUser } from "@/lib/types";
import { logoutAction } from "@/app/actions/auth";

export default function Nav({ session }: { session: SessionUser | null }) {
  return (
    <header className="border-b border-neutral-800">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          🎬 Main Street Cinema
        </Link>
        <nav className="flex items-center gap-5 text-sm">
          <Link href="/" className="text-neutral-300 hover:text-white">
            Movies
          </Link>
          {session ? (
            <>
              <Link href="/account" className="text-neutral-300 hover:text-white">
                My Bookings
              </Link>
              {session.role === "admin" && (
                <Link href="/admin" className="text-neutral-300 hover:text-white">
                  Admin
                </Link>
              )}
              <span className="text-neutral-500">Hi, {session.name.split(" ")[0]}</span>
              <form action={logoutAction}>
                <button className="rounded-md bg-neutral-800 px-3 py-1.5 text-neutral-200 hover:bg-neutral-700">
                  Log out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="text-neutral-300 hover:text-white">
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-md bg-red-600 px-3 py-1.5 font-medium text-white hover:bg-red-500"
              >
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

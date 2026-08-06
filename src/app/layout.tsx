import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { getSession } from "@/lib/auth";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "Shree Movies",
  description: "Browse movies, pick your seats, and book online.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getSession();
  return (
    <html lang="en">
      <body className="min-h-screen bg-neutral-950 text-neutral-100 antialiased">
        <Nav session={session} />
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        <footer className="mx-auto max-w-6xl px-4 py-10 text-sm text-neutral-500">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>Shree Movies — book your show online.</span>
            <Link href="/contact" className="hover:text-neutral-300">
              Contact Us
            </Link>
          </div>
        </footer>
      </body>
    </html>
  );
}

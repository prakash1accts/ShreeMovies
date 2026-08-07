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
        <footer className="mx-auto max-w-6xl px-4 py-10 text-sm text-neutral-500 print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>Shree Movies — book your show online.</span>
            <div className="flex items-center gap-4">
              
                href="https://www.instagram.com/shree_indianmovies?igsh=MXB0emhibng1OXk1dQ=="
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-neutral-300"
              >
                Instagram
              </a>
              
                href="https://www.facebook.com/profile.php?id=100095605175114&mibextid=wwXIfr&mibextid=wwXIfr"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-neutral-300"
              >
                Facebook
              </a>
              <Link href="/contact" className="hover:text-neutral-300">
                Contact Us
              </Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}

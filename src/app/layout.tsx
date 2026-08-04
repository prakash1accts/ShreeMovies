import type { Metadata } from "next";
import "./globals.css";
import { getSession } from "@/lib/auth";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "Main Street Cinema",
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
          Main Street Cinema — demo booking app.
        </footer>
      </body>
    </html>
  );
}

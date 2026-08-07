import { cookies } from "next/headers";
import { randomUUID } from "crypto";

// Anonymous per-browser id for the poster "interested / not interested"
// vote — no account needed to vote, but one vote per person per movie.
const VOTER_COOKIE = "shree_voter_id";

export async function getOrCreateVoterKey(): Promise<string> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(VOTER_COOKIE)?.value;
  if (existing) return existing;
  const id = randomUUID();
  cookieStore.set(VOTER_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return id;
}

export async function getVoterKey(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(VOTER_COOKIE)?.value ?? null;
}

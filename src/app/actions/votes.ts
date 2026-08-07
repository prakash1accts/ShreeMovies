"use server";

import { revalidatePath } from "next/cache";
import { recordMovieVote } from "@/lib/data";
import { getOrCreateVoterKey } from "@/lib/voter";
import type { VoteValue } from "@/lib/types";

export async function voteMovieAction(formData: FormData) {
  const movieId = String(formData.get("movieId") || "");
  const vote = String(formData.get("vote") || "") as VoteValue;
  if (!movieId || (vote !== "up" && vote !== "down")) return;

  const voterKey = await getOrCreateVoterKey();
  await recordMovieVote(movieId, voterKey, vote);
  revalidatePath("/");
}

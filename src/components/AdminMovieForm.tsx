"use client";

import { useActionState, useState } from "react";
import { createMovieAction, updateMovieAction } from "@/app/actions/admin";
import type { Movie } from "@/lib/types";

const LANGUAGE_OPTIONS = ["Hindi", "Tamil", "Telugu", "English", "Other"];

export default function AdminMovieForm({ movie }: { movie?: Movie }) {
  const isEdit = Boolean(movie);
  const [state, formAction, isPending] = useActionState(
    isEdit ? updateMovieAction : createMovieAction,
    undefined
  );
  const [posterUrl, setPosterUrl] = useState(movie?.poster_url ?? "");
  const [posterBroken, setPosterBroken] = useState(false);

  return (
    <form
      action={formAction}
      className="grid grid-cols-1 gap-3 rounded-lg border border-neutral-800 bg-neutral-900 p-5 sm:grid-cols-2"
    >
      {isEdit && <input type="hidden" name="id" value={movie!.id} />}
      <div className="sm:col-span-2">
        <label className="mb-1 block text-sm text-neutral-300">Title</label>
        <input
          name="title"
          required
          defaultValue={movie?.title}
          className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-red-500"
        />
      </div>
      <div className="sm:col-span-2">
        <label className="mb-1 block text-sm text-neutral-300">Description</label>
        <textarea
          name="description"
          rows={2}
          defaultValue={movie?.description ?? undefined}
          className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-red-500"
        />
      </div>
      <div className="sm:col-span-2">
        <label className="mb-1 block text-sm text-neutral-300">Poster image URL</label>
        <input
          name="posterUrl"
          placeholder="https://..."
          defaultValue={movie?.poster_url ?? undefined}
          onChange={(e) => {
            setPosterUrl(e.target.value);
            setPosterBroken(false);
          }}
          className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-red-500"
        />
        {posterUrl && (
          <div className="mt-2 flex items-center gap-3">
            <img
              src={posterUrl}
              alt="Poster preview"
              onLoad={() => setPosterBroken(false)}
              onError={() => setPosterBroken(true)}
              className="h-24 w-16 rounded border border-neutral-700 object-cover"
            />
            <p className="text-xs text-neutral-500">
              {posterBroken
                ? "⚠️ This URL didn't load. Some sites (like Plex/TMDB proxy links) block hotlinking — try right-clicking the image on its source page and choosing \"Copy image address\" for a direct link, or upload the image to a plain image host instead."
                : "Live preview — if you see the poster here, it will show on the site too."}
            </p>
          </div>
        )}
      </div>
      <div>
        <label className="mb-1 block text-sm text-neutral-300">Genre</label>
        <input
          name="genre"
          defaultValue={movie?.genre ?? undefined}
          className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-red-500"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm text-neutral-300">Rating</label>
        <input
          name="rating"
          placeholder="PG-13"
          defaultValue={movie?.rating ?? undefined}
          className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-red-500"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm text-neutral-300">Duration (minutes)</label>
        <input
          type="number"
          name="durationMinutes"
          defaultValue={movie?.duration_minutes ?? 120}
          className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-red-500"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm text-neutral-300">Language / Industry</label>
        <select
          name="language"
          defaultValue={movie?.language ?? ""}
          className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-red-500"
        >
          <option value="">— Select —</option>
          {LANGUAGE_OPTIONS.map((lang) => (
            <option key={lang} value={lang}>
              {lang}
            </option>
          ))}
        </select>
      </div>

      {state?.error && (
        <p className="sm:col-span-2 text-sm text-red-400">{state.error}</p>
      )}

      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50"
        >
          {isPending ? "Saving…" : isEdit ? "Save changes" : "Add movie"}
        </button>
      </div>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { createMovieAction } from "@/app/actions/admin";

export default function AdminMovieForm() {
  const [state, formAction, isPending] = useActionState(createMovieAction, undefined);

  return (
    <form
      action={formAction}
      className="grid grid-cols-1 gap-3 rounded-lg border border-neutral-800 bg-neutral-900 p-5 sm:grid-cols-2"
    >
      <div className="sm:col-span-2">
        <label className="mb-1 block text-sm text-neutral-300">Title</label>
        <input
          name="title"
          required
          className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-red-500"
        />
      </div>
      <div className="sm:col-span-2">
        <label className="mb-1 block text-sm text-neutral-300">Description</label>
        <textarea
          name="description"
          rows={2}
          className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-red-500"
        />
      </div>
      <div className="sm:col-span-2">
        <label className="mb-1 block text-sm text-neutral-300">Poster image URL</label>
        <input
          name="posterUrl"
          placeholder="https://..."
          className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-red-500"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm text-neutral-300">Genre</label>
        <input
          name="genre"
          className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-red-500"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm text-neutral-300">Rating</label>
        <input
          name="rating"
          placeholder="PG-13"
          className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-red-500"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm text-neutral-300">Duration (minutes)</label>
        <input
          type="number"
          name="durationMinutes"
          defaultValue={120}
          className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-red-500"
        />
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
          {isPending ? "Adding…" : "Add movie"}
        </button>
      </div>
    </form>
  );
}

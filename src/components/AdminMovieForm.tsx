"use client";

import { useActionState, useState } from "react";
import { createMovieAction, updateMovieAction } from "@/app/actions/admin";
import type { Movie } from "@/lib/types";

const LANGUAGE_OPTIONS = ["Hindi", "Tamil", "Telugu", "English", "Other"];

// Shrinks and re-encodes an uploaded image client-side before it's stored
// (as a data: URL) directly in the poster_url column — keeps the database
// row small instead of storing a multi-megabyte phone photo untouched.
function resizeImageFile(file: File, maxDim = 700, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas not supported"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => reject(new Error("Could not read that image."));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.readAsDataURL(file);
  });
}

export default function AdminMovieForm({ movie }: { movie?: Movie }) {
  const isEdit = Boolean(movie);
  const [state, formAction, isPending] = useActionState(
    isEdit ? updateMovieAction : createMovieAction,
    undefined
  );
  const [posterUrl, setPosterUrl] = useState(movie?.poster_url ?? "");
  const [posterBroken, setPosterBroken] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      const dataUrl = await resizeImageFile(file);
      setPosterUrl(dataUrl);
      setPosterBroken(false);
    } catch {
      setUploadError("Could not process that image — try a different file (JPG or PNG works best).");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

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
        <label className="mb-1 block text-sm text-neutral-300">Poster image</label>
        <div className="flex flex-wrap items-center gap-3">
          <label className="cursor-pointer rounded-md bg-neutral-800 px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-700">
            {uploading ? "Processing…" : "Upload image"}
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              disabled={uploading}
              className="hidden"
            />
          </label>
          <span className="text-xs text-neutral-500">or paste a URL below</span>
        </div>
        <input
          name="posterUrl"
          placeholder="https://..."
          value={posterUrl}
          onChange={(e) => {
            setPosterUrl(e.target.value);
            setPosterBroken(false);
          }}
          className="mt-2 w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-red-500"
        />
        {uploadError && <p className="mt-1 text-xs text-red-400">{uploadError}</p>}
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
                ? "⚠️ This URL didn't load. Some sites (like Plex/TMDB proxy links) block hotlinking — try right-clicking the image on its source page and choosing \"Copy image address\" for a direct link, or use the Upload image button instead."
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
          disabled={isPending || uploading}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50"
        >
          {isPending ? "Saving…" : isEdit ? "Save changes" : "Add movie"}
        </button>
      </div>
    </form>
  );
}

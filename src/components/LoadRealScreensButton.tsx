"use client";

import { useFormStatus } from "react-dom";

export default function LoadRealScreensButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50"
    >
      {pending ? "Loading…" : "Load Screen 4, 6 & 7 seat maps"}
    </button>
  );
}

"use client";

import { useActionState } from "react";

export default function GridScreenForm({
  action,
}: {
  action: (
    prevState: { error?: string } | undefined,
    formData: FormData
  ) => Promise<{ error?: string } | undefined>;
}) {
  const [state, formAction, isPending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-4">
      <input
        name="name"
        required
        placeholder="Screen name (e.g. Screen 2)"
        className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-red-500 sm:col-span-2"
      />
      <input
        name="rows"
        type="number"
        min={1}
        max={26}
        defaultValue={8}
        placeholder="Rows"
        className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-red-500"
      />
      <input
        name="cols"
        type="number"
        min={1}
        max={60}
        defaultValue={10}
        placeholder="Seats per row"
        className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-red-500"
      />
      {state?.error && <p className="text-sm text-red-400 sm:col-span-4">{state.error}</p>}
      <div className="sm:col-span-4">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-neutral-800 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          {isPending ? "Adding…" : "Add screen"}
        </button>
      </div>
    </form>
  );
}

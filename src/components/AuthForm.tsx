"use client";

import { useActionState } from "react";
import Link from "next/link";

type ActionState = { error?: string } | undefined;

export default function AuthForm({
  mode,
  action,
}: {
  mode: "login" | "signup" | "setup";
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [state, formAction, isPending] = useActionState(action, undefined);

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-2xl font-bold">
        {mode === "login"
          ? "Log in"
          : mode === "setup"
          ? "Create your admin account"
          : "Create your account"}
      </h1>
      <p className="mt-1 text-sm text-neutral-400">
        {mode === "login"
          ? "Welcome back to Shree Movies."
          : mode === "setup"
          ? "This is a one-time setup step — this page stops working once an admin account exists."
          : "Sign up to book tickets online."}
      </p>

      <form action={formAction} className="mt-6 space-y-4">
        {(mode === "signup" || mode === "setup") && (
          <div>
            <label className="mb-1 block text-sm text-neutral-300">Name</label>
            <input
              name="name"
              required
              className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-red-500"
            />
          </div>
        )}
        <div>
          <label className="mb-1 block text-sm text-neutral-300">Email</label>
          <input
            type="email"
            name="email"
            required
            className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-red-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-neutral-300">Password</label>
          <input
            type="password"
            name="password"
            required
            minLength={mode !== "login" ? 6 : undefined}
            className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-red-500"
          />
        </div>

        {state?.error && <p className="text-sm text-red-400">{state.error}</p>}

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-md bg-red-600 py-2.5 font-medium text-white transition hover:bg-red-500 disabled:opacity-50"
        >
          {isPending
            ? "Please wait…"
            : mode === "login"
            ? "Log in"
            : mode === "setup"
            ? "Create admin account"
            : "Sign up"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-neutral-400">
        {mode === "login" ? (
          <>
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-red-400 hover:underline">
              Sign up
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link href="/login" className="text-red-400 hover:underline">
              Log in
            </Link>
          </>
        )}
      </p>
    </div>
  );
}

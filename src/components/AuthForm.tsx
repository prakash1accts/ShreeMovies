"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { lookupCustomerByPhoneAction } from "@/app/actions/customers";

type ActionState = { error?: string } | undefined;

export default function AuthForm({
  mode,
  action,
  next,
}: {
  mode: "login" | "signup" | "setup";
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  // Where to send the user after a successful login — e.g. back to the
  // ticket-verification page they scanned before being asked to log in.
  next?: string;
}) {
  const [state, formAction, isPending] = useActionState(action, undefined);

  const [phone, setPhone] = useState("+244");
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [lookupStatus, setLookupStatus] = useState<"idle" | "checking" | "found" | "new">("idle");

  // Same master-directory lookup used on the admin side: if this phone
  // number already has a name on file (e.g. from a walk-in box-office
  // visit), fill it in automatically instead of asking the customer to
  // retype it.
  async function handlePhoneBlur() {
    const trimmed = phone.trim();
    if (!trimmed || trimmed === "+244") {
      setLookupStatus("idle");
      return;
    }
    setLookupStatus("checking");
    const match = await lookupCustomerByPhoneAction(trimmed);
    if (match) {
      setName(match.name);
      if (match.whatsapp) setWhatsapp(match.whatsapp);
      setLookupStatus("found");
    } else {
      setLookupStatus("new");
    }
  }

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
        {mode === "login" && next && <input type="hidden" name="next" value={next} />}
        {mode === "signup" && (
          <div>
            <label className="mb-1 block text-sm text-neutral-300">Phone number</label>
            <input
              type="tel"
              name="phone"
              required
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setLookupStatus("idle");
              }}
              onBlur={handlePhoneBlur}
              placeholder="+244923456789"
              className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-red-500"
            />
            <p className="mt-1 text-xs text-neutral-500">
              {lookupStatus === "checking"
                ? "Checking…"
                : lookupStatus === "found"
                ? "✓ Welcome back — we filled in your name below."
                : "Include your country code, e.g. +244 for Angola."}
            </p>
          </div>
        )}
        {mode === "signup" && (
          <div>
            <label className="mb-1 block text-sm text-neutral-300">Name</label>
            <input
              name="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-red-500"
            />
          </div>
        )}
        {mode === "setup" && (
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
        {mode === "signup" && (
          <div>
            <label className="mb-1 block text-sm text-neutral-300">WhatsApp number</label>
            <input
              type="tel"
              name="whatsapp"
              required
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="If different from your phone number above"
              className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-red-500"
            />
          </div>
        )}
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

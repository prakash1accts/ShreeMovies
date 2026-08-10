"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  clearSessionCookie,
  hashPassword,
  setSessionCookie,
  verifyPassword,
} from "@/lib/auth";
import { createUser, getUserByEmail, hasAnyAdmin } from "@/lib/data";

export async function signupAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const phone = String(formData.get("phone") || "").trim();
  const whatsapp = String(formData.get("whatsapp") || "").trim();

  if (!name || !email || !password || !phone || !whatsapp) {
    return { error: "Please fill in all fields." };
  }
  if (password.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }
  if (await getUserByEmail(email)) {
    return { error: "An account with that email already exists." };
  }

  const passwordHash = await hashPassword(password);
  const user = await createUser({ name, email, passwordHash, phone, whatsapp });
  await setSessionCookie({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  });

  redirect("/account");
}

// Creates the very first admin account. Only works while zero admins exist
// yet (checked again here, not just on the page), so this can't be used to
// mint extra admins later — after the first one, it always errors out.
export async function setupAdminAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  if (await hasAnyAdmin()) {
    return { error: "An admin account already exists. Go to /login instead." };
  }

  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  if (!name || !email || !password) {
    return { error: "Please fill in all fields." };
  }
  if (password.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }
  if (await getUserByEmail(email)) {
    return { error: "An account with that email already exists." };
  }

  const passwordHash = await hashPassword(password);
  const user = await createUser({ name, email, passwordHash, role: "admin" });
  await setSessionCookie({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  });

  redirect("/admin");
}

export async function loginAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const next = String(formData.get("next") || "");

  const user = await getUserByEmail(email);
  if (!user) {
    return { error: "Invalid email or password." };
  }
  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    return { error: "Invalid email or password." };
  }

  await setSessionCookie({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  });

  // Only honor `next` when it's a same-site path (starts with a single "/",
  // not "//" or "/\" which browsers can treat as protocol-relative) — e.g.
  // sent back here after scanning a ticket QR while logged out, so staff
  // land back on that exact booking instead of the generic dashboard.
  if (next && /^\/(?!\/|\\)/.test(next)) {
    redirect(next);
  }

  redirect(user.role === "admin" ? "/admin" : "/account");
}

export async function logoutAction() {
  await clearSessionCookie();
  revalidatePath("/");
  redirect("/");
}

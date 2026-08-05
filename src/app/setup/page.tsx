import { redirect } from "next/navigation";
import AuthForm from "@/components/AuthForm";
import { setupAdminAction } from "@/app/actions/auth";
import { hasAnyAdmin } from "@/lib/data";

// One-time bootstrap page: creates the first admin account directly on the
// live site, so you don't need database access to get started. It stops
// offering this (redirects to /login) the moment any admin account exists,
// so it's safe to leave deployed.
export default async function SetupPage() {
  if (await hasAnyAdmin()) {
    redirect("/login");
  }

  return <AuthForm mode="setup" action={setupAdminAction} />;
}

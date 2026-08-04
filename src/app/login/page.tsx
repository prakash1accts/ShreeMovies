import AuthForm from "@/components/AuthForm";
import { loginAction } from "@/app/actions/auth";

export default function LoginPage() {
  return <AuthForm mode="login" action={loginAction} />;
}

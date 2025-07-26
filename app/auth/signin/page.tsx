import SignIn from "@/components/auth/sign-in";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { isAuthEnabled } from "@/config/auth";

export default async function SignInPage() {
  // If auth is disabled, redirect to home
  if (!isAuthEnabled()) {
    redirect("/");
  }

  // If already signed in, redirect to home
  const session = await auth();
  if (session) {
    redirect("/");
  }

  return <SignIn />;
}
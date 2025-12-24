import SignIn from "@/components/auth/sign-in";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { isAuthEnabled } from "@/config/auth";
import { getTenantContext } from "@/lib/get-tenant-context";
import type { Settings } from "@boldvideo/bold-js";

// Extend Settings with logo properties
interface ExtendedSettings extends Settings {
  logoUrl?: string;
  logoDarkUrl?: string;
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // If auth is disabled, redirect to home
  if (!isAuthEnabled()) {
    redirect("/");
  }

  // If already signed in, redirect to home
  const session = await auth();
  if (session) {
    redirect("/");
  }

  // Await searchParams (Next.js 15 change)
  const params = await searchParams;

  // Fetch settings for logo
  let settings = {} as ExtendedSettings;
  try {
    const context = await getTenantContext();
    if (context?.settings) {
      settings = context.settings as ExtendedSettings;
    }
  } catch (error) {
    console.error("Failed to fetch settings:", error);
  }

  return <SignIn searchParams={params} settings={settings} />;
}
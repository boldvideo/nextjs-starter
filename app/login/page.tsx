import { Wordmark } from "@/components/shiftai/wordmark";
import { redirect } from "next/navigation";
import { getTenantContext } from "@/lib/get-tenant-context";
import { PortalLoginForm } from "@/components/portal-auth/login-form";
import { isPortalAuthRequired } from "@/lib/portal-auth";
import { getSafeRedirect } from "@/lib/portal-redirect";

interface ExtendedSettings {
  logoUrl?: string;
  logoDarkUrl?: string;
  account?: {
    name?: string;
  };
  portal?: {
    auth?: {
      required?: boolean;
    };
  };
}

interface LoginPageProps {
  searchParams: Promise<{ redirect?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const context = await getTenantContext();
  const settings = context?.settings as ExtendedSettings | null;
  const params = await searchParams;

  const authRequired =
    isPortalAuthRequired(settings) ||
    process.env.PORTAL_AUTH_REQUIRED === "true";

  if (!authRequired) {
    redirect(getSafeRedirect(params.redirect));
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-5">
      <div className="sx-grid pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="sx-glow pointer-events-none absolute -right-40 -top-56 h-[760px] w-[760px]" aria-hidden="true" />
      <div className="relative w-full max-w-[440px]">
        <Wordmark />
        <p className="sx-label sx-eyebrow mt-12">The AI Revolution Show · Member library</p>
        <h1 className="sx-display mt-6 text-[64px] md:text-[80px]">
          Members <span className="text-acid">only.</span>
        </h1>
        <p className="mt-5 text-[17px] leading-[1.65] text-muted-foreground">
          Every episode, searchable, with an assistant that tells you which founder already faced your decision.
        </p>
        <div className="mt-9 rounded-card border border-border bg-surface p-6">
          <PortalLoginForm />
        </div>
        <p className="sx-label mt-6 !text-[10px] text-dim">A private demo for Shift AI, built on Bold</p>
      </div>
    </div>
  );
}

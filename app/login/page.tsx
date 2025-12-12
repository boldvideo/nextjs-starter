import Image from "next/image";
import { redirect } from "next/navigation";
import { getTenantContext } from "@/lib/get-tenant-context";
import { PortalLoginForm } from "@/components/portal-auth/login-form";
import { isPortalAuthRequired } from "@/lib/portal-auth";
import { getSafeRedirect } from "@/lib/portal-redirect";

interface ExtendedSettings {
  logo_url?: string;
  logo_dark_url?: string;
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

  const logoUrl = settings?.logo_url || "/bold-logo.svg";
  const logoDark = settings?.logo_dark_url;
  const portalName = settings?.account?.name || "Portal";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <div className="flex justify-center mb-8">
            {logoDark ? (
              <>
                <Image
                  src={logoUrl}
                  alt="Logo"
                  className="h-20 w-auto object-contain block dark:hidden"
                  width={200}
                  height={80}
                  priority
                />
                <Image
                  src={logoDark}
                  alt="Logo"
                  className="h-20 w-auto object-contain hidden dark:block"
                  width={200}
                  height={80}
                  priority
                />
              </>
            ) : (
              <Image
                src={logoUrl}
                alt="Logo"
                className="h-20 w-auto object-contain"
                width={200}
                height={80}
                priority
              />
            )}
          </div>

          <h2 className="text-2xl font-bold text-foreground">
            Sign in to {portalName}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter the password to access this portal
          </p>
        </div>

        <div className="mt-8">
          <PortalLoginForm />
        </div>
      </div>
    </div>
  );
}

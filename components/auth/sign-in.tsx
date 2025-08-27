import { signIn } from "@/auth";
import { getAuthConfig } from "@/config/auth";
import Image from "next/image";
import { headers } from "next/headers";
import type { Settings } from "@boldvideo/bold-js";

interface SignInProps {
  searchParams?: { [key: string]: string | string[] | undefined };
  settings?: Settings;
}

export default function SignIn({ searchParams, settings }: SignInProps) {
  const authConfig = getAuthConfig();
  const hasDual = authConfig.hasDualProviders;
  const primaryProvider = authConfig.provider === "dual" ? "workos" : authConfig.provider;
  
  // If searchParams not provided (when used in layout), try to get from URL
  let showTeamAccess = false;
  
  if (searchParams) {
    // Use provided searchParams
    showTeamAccess = searchParams.team === 'true' || 
                     searchParams.team === '1' ||
                     searchParams.bold === 'true' ||
                     searchParams.bold === '1';
  } else {
    // Try to get from current URL when used in protected routes
    try {
      const headersList = headers();
      const fullUrl = headersList.get('referer') || '';
      const url = new URL(fullUrl);
      const params = url.searchParams;
      showTeamAccess = params.get('team') === 'true' || 
                       params.get('team') === '1' ||
                       params.get('bold') === 'true' ||
                       params.get('bold') === '1';
    } catch {
      // If we can't parse URL, default to false
      showTeamAccess = false;
    }
  }

  // Determine what to show
  const showWorkOS = primaryProvider === "workos" || (hasDual && !showTeamAccess);
  const showGoogle = (primaryProvider === "google" && !hasDual) || (hasDual && showTeamAccess);
  const showBothButtons = hasDual && showTeamAccess;

  // Determine logo to use
  const logoUrl = settings?.logo_url || "/bold-logo.svg";
  const logoDark = settings?.logo_dark_url;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            {logoDark ? (
              <>
                {/* Light Mode Logo */}
                <Image
                  src={logoUrl}
                  alt="Logo"
                  className="h-20 w-auto object-contain block dark:hidden"
                  width={200}
                  height={80}
                  priority
                />
                {/* Dark Mode Logo */}
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
              // Single logo for both themes
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
            Sign in to continue
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Please sign in with your account to access this content
          </p>
        </div>

        <div className="mt-8 space-y-3">
          {/* WorkOS SSO Button - shown by default */}
          {showWorkOS && (
            <form
              action={async () => {
                "use server";
                await signIn("workos", { redirectTo: "/" });
              }}
            >
              <button
                type="submit"
                className="w-full flex items-center justify-center px-4 py-3 border border-border rounded-md shadow-sm text-sm font-medium text-foreground bg-background hover:bg-accent transition-colors"
              >
                <svg
                  className="w-5 h-5 mr-2"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
                </svg>
                Sign in with SSO
              </button>
            </form>
          )}

          {/* Divider - only shown when both buttons are visible */}
          {showBothButtons && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or
                </span>
              </div>
            </div>
          )}

          {/* Google OAuth Button - only shown with team parameter or when Google is primary */}
          {showGoogle && (
            <form
              action={async () => {
                "use server";
                await signIn("google", { redirectTo: "/" });
              }}
            >
              <button
                type="submit"
                className="w-full flex items-center justify-center px-4 py-3 border border-border rounded-md shadow-sm text-sm font-medium text-foreground bg-background hover:bg-accent transition-colors"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                {showBothButtons ? "Sign in with Google (Bold Team)" : "Sign in with Google"}
              </button>
            </form>
          )}

          {/* Fallback for custom providers */}
          {!showWorkOS && !showGoogle && primaryProvider !== "google" && primaryProvider !== "workos" && (
            <form
              action={async () => {
                "use server";
                await signIn(primaryProvider, { redirectTo: "/" });
              }}
            >
              <button
                type="submit"
                className="w-full flex items-center justify-center px-4 py-3 border border-border rounded-md shadow-sm text-sm font-medium text-foreground bg-background hover:bg-accent transition-colors"
              >
                Sign in with {primaryProvider}
              </button>
            </form>
          )}
        </div>

        {/* Helper text only when both are shown */}
        {showBothButtons && (
          <p className="mt-4 text-xs text-center text-muted-foreground">
            Bold team members: Use Google sign-in
          </p>
        )}
      </div>
    </div>
  );
}
import { auth } from "@/auth";
import { isAuthEnabled } from "@/config/auth";

export default auth((req) => {
  // Skip middleware if auth is disabled
  if (!isAuthEnabled()) {
    return;
  }

  // Auth is enabled, so we can use the auth object
  // The auth callback is automatically handling authentication
  // If you need custom logic, you can add it here
});

export const config = {
  // Matcher configuration - protect all routes except:
  // - api routes
  // - static files
  // - auth routes
  matcher: [
    "/((?!api|auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};


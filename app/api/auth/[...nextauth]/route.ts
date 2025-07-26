import { handlers } from "@/auth";
import { isAuthEnabled } from "@/config/auth";

// Only export handlers if auth is enabled
// This prevents the auth routes from being accessible when auth is disabled
export const GET = isAuthEnabled() ? handlers.GET : undefined;
export const POST = isAuthEnabled() ? handlers.POST : undefined;
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import WorkOS from "next-auth/providers/workos";
import type { NextAuthConfig } from "next-auth";
import { isAuthEnabled, getAuthProvider, isEmailAllowed } from "@/config/auth";

// Build providers array based on configuration
const providers: NextAuthConfig["providers"] = [];

if (isAuthEnabled()) {
  const provider = getAuthProvider();

  if (provider === "google" && process.env.GOOGLE_CLIENT_ID) {
    providers.push(
      Google({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      })
    );
  }

  if (provider === "workos" && process.env.WORKOS_CLIENT_ID) {
    providers.push(
      WorkOS({
        clientId: process.env.WORKOS_CLIENT_ID,
        clientSecret: process.env.WORKOS_API_KEY!,
        client: {
          token_endpoint_auth_method: "client_secret_post",
        },
      })
    );
  }
}

export const config = {
  providers,
  debug: process.env.NODE_ENV === "development",
  secret: process.env.AUTH_SECRET,
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  callbacks: {
    authorized({ request, auth }) {
      // If auth is disabled, always return true
      if (!isAuthEnabled()) {
        return true;
      }

      // Check if user is authenticated
      return !!auth;
    },
    signIn({ user, account, profile }) {
      // If auth is disabled, always allow
      if (!isAuthEnabled()) {
        return true;
      }

      // Check email domain restrictions
      if (user.email) {
        return isEmailAllowed(user.email);
      }

      // Deny if no email
      return false;
    },
  },
  session: {
    strategy: "jwt",
  },
} satisfies NextAuthConfig;

export const { handlers, signIn, signOut, auth } = NextAuth(config);
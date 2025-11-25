import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import WorkOS from "next-auth/providers/workos";
import type { NextAuthConfig } from "next-auth";
import { isAuthEnabled, getAuthProvider, isEmailAllowed, isBoldTeamEmail } from "@/config/auth";

// Build providers array based on configuration
const providers: NextAuthConfig["providers"] = [];

if (isAuthEnabled()) {
  const provider = getAuthProvider();

  // Always add Google if configured (for Bold team access)
  if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
    providers.push(Google);
  }

  // Add WorkOS for customer organization access
  if (provider === "workos" && process.env.AUTH_WORKOS_ID) {
    // WorkOS requires passing the connection ID according to AuthJS docs
    if (!process.env.AUTH_WORKOS_CONNECTION) {
      console.error(
        "WorkOS authentication is enabled but AUTH_WORKOS_CONNECTION is not set. Please configure it in your .env file."
      );
    } else {
      providers.push(WorkOS({ connection: process.env.AUTH_WORKOS_CONNECTION }));
    }
  } else if (provider === "google" && !process.env.AUTH_GOOGLE_ID) {
    // If Google is the primary provider but not configured, warn
    console.error(
      "Google authentication is enabled but AUTH_GOOGLE_ID is not set. Please configure it in your .env file."
    );
  }
}


export const config = {
  providers,
  debug: process.env.NODE_ENV === "development",
  secret: process.env.AUTH_SECRET || (isAuthEnabled() ? undefined : "dummy-secret-when-auth-disabled"),
  trustHost: true, // Allow Auth.js to work with ngrok and other proxies
  pages: {
    signIn: "/auth/signin",
    error: "/auth/signin?error=true",
  },
  callbacks: {
    authorized({ auth }) {
      // If auth is disabled, always return true
      if (!isAuthEnabled()) {
        return true;
      }

      // Check if user is authenticated
      return !!auth;
    },
    signIn({ user, account }) {
      // If auth is disabled, always allow
      if (!isAuthEnabled()) {
        return true;
      }

      // Check if user has an email
      if (!user.email) {
        return false;
      }

      // Allow Bold team members (via Google OAuth)
      if (account?.provider === "google" && isBoldTeamEmail(user.email)) {
        return true;
      }

      // For WorkOS, check domain restrictions
      if (account?.provider === "workos") {
        return isEmailAllowed(user.email);
      }

      // For Google (non-Bold team), check domain restrictions
      if (account?.provider === "google") {
        return isEmailAllowed(user.email);
      }

      // Default deny
      return false;
    },
  },
  session: {
    strategy: "jwt",
  },
} satisfies NextAuthConfig;

export const { handlers, signIn, signOut, auth } = NextAuth(config);


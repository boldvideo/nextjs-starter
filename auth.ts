import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import WorkOS from "next-auth/providers/workos";
import type { NextAuthConfig } from "next-auth";
import { isAuthEnabled, getAuthProvider, isEmailAllowed } from "@/config/auth";

// Build providers array based on configuration
const providers: NextAuthConfig["providers"] = [];

if (isAuthEnabled()) {
  const provider = getAuthProvider();

  if (provider === "google" && process.env.AUTH_GOOGLE_ID) {
    providers.push(Google);
  }

  if (provider === "workos" && process.env.AUTH_WORKOS_ID) {
    // const workosConfig: any = {
    //   connection: process.env.AUTH_WORKOS_CONNECTION!,
    // };
    // const workosConfig: any = {
    //   client: {
    //     token_endpoint_auth_method: "client_secret_post",
    //   },
    // };
    //
    // // Add organization if configured
    // if (process.env.AUTH_WORKOS_ORG) {
    //   workosConfig.authorization = {
    //     params: {
    //       organization: process.env.AUTH_WORKOS_ORG,
    //     },
    //   };
    // }

    providers.push(
      WorkOS({
        connection: process.env.AUTH_WORKOS_CONNECTION!,
      }),
    );
  }
}

// Determine the base URL for auth
// function getAuthUrl() {
//   if (process.env.AUTH_URL) {
//     return process.env.AUTH_URL;
//   }
//   if (process.env.NEXTAUTH_URL) {
//     return process.env.NEXTAUTH_URL;
//   }
//   if (process.env.VERCEL_URL) {
//     return `https://${process.env.VERCEL_URL}`;
//   }
//   // Fallback for local development
//   return "http://localhost:3000";
// }

export const config = {
  providers,
  debug: process.env.NODE_ENV === "development",
  secret: process.env.AUTH_SECRET,
  trustHost: true, // Allow Auth.js to work with ngrok and other proxies
  basePath: "/auth", // Updated to match new route location
  // pages: {
  //   signIn: "/auth/signin",
  //   error: "/auth/error",
  // },
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


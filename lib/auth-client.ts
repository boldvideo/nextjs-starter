"use client";

import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();

export const { useSession, signIn, signOut } = authClient;

/** Google sign-in that lands back where the member started. */
export function signInWithGoogle(callbackURL?: string) {
  return signIn.social({
    provider: "google",
    callbackURL: callbackURL ?? window.location.pathname + window.location.search,
  });
}

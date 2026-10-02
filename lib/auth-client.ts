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

/**
 * Log out of the game in this browser: the Google session, the coin (the
 * player's email cookie), and the coin flag. XP and trophies stay.
 */
export async function logOut(redirectTo = "/") {
  await Promise.allSettled([signOut(), fetch("/api/gym/player", { method: "DELETE" })]);
  const { forgetCoin } = await import("@/lib/gym-arcade");
  forgetCoin();
  window.location.href = redirectTo;
}

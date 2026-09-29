"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";

export interface GymProfile {
  business_name?: string;
  website?: string;
  business_description?: string;
}

export interface GymMemberInfo {
  signedIn: boolean;
  name?: string;
  email?: string;
  image?: string | null;
  memberSince?: string;
  memberNo?: string;
  profile?: GymProfile;
}

// Shared across every component on the page; refreshed after a save.
let cache: GymMemberInfo | null = null;
let inflight: Promise<GymMemberInfo> | null = null;
const listeners = new Set<(m: GymMemberInfo) => void>();

function fetchMember(force = false): Promise<GymMemberInfo> {
  if (force) inflight = null;
  inflight ??= fetch("/api/gym/profile", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : { signedIn: false }))
    .catch(() => ({ signedIn: false }))
    .then((m: GymMemberInfo) => {
      cache = m;
      listeners.forEach((l) => l(m));
      return m;
    });
  return inflight;
}

/**
 * The signed-in member and their profile (Bold viewer traits). `session`
 * answers "signed in?" instantly from the auth cookie; `member` adds the
 * profile once /api/gym/profile answers.
 */
export function useGymMember() {
  const { data: session, isPending } = useSession();
  const [member, setMember] = useState<GymMemberInfo | null>(cache);
  const signedIn = Boolean(session?.user);

  useEffect(() => {
    listeners.add(setMember);
    return () => {
      listeners.delete(setMember);
    };
  }, []);

  useEffect(() => {
    // Signed out: `member` is derived as null below, nothing to fetch
    if (isPending || !signedIn) return;
    if (!cache?.signedIn) fetchMember(true);
  }, [signedIn, isPending]);

  const refresh = useCallback(() => fetchMember(true), []);

  return {
    isPending,
    signedIn,
    user: session?.user ?? null,
    member: signedIn ? member : null,
    refresh,
  };
}

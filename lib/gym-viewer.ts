import "server-only";

import { headers } from "next/headers";
import type { Viewer } from "@boldvideo/bold-js";
import { auth } from "@/lib/auth";
import { getTenantContext } from "@/lib/get-tenant-context";

/**
 * Signed-in members are Bold viewers: the portal has no user table of its
 * own. Looked up by email, created on first sight. Their traits are the
 * member profile, and passing the viewer to /ai/chat is what personalizes
 * answers (and, with the memory flag, lets the coach remember them).
 */

export interface GymMember {
  viewer: Viewer;
  name: string;
  email: string;
  image?: string | null;
}

// email -> viewer id; saves a lookup per question on a warm instance
const viewerIds = new Map<string, string>();

export async function getSessionUser() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    return session?.user ?? null;
  } catch {
    return null;
  }
}

/** The signed-in member's Bold viewer, created on first use. Null when signed out. */
export async function getMember(): Promise<GymMember | null> {
  const user = await getSessionUser();
  if (!user?.email) return null;
  const context = await getTenantContext();
  if (!context) return null;
  const { viewers } = context.client;
  const email = user.email.toLowerCase();

  let viewer: Viewer | null = null;
  const cached = viewerIds.get(email);
  if (cached) {
    viewer = await viewers.get(cached).then((r) => r.data).catch(() => null);
  }
  if (!viewer) {
    viewer = await viewers.lookup({ email }).then((r) => r.data).catch(() => null);
  }
  if (!viewer) {
    viewer = await viewers
      .create({ name: user.name || email, email, externalId: `gym:${email}`, traits: {} })
      .then((r) => r.data)
      .catch((error) => {
        console.error("[gym] viewer create failed", error);
        return null;
      });
  }
  if (!viewer) return null;
  viewerIds.set(email, viewer.id);
  return { viewer, name: user.name || email, email, image: user.image };
}

/**
 * Just the viewer id for the signed-in member, for tagging questions. Uses
 * the warm-instance cache so asking doesn't cost an extra round trip.
 */
export async function getMemberViewerId(): Promise<string | null> {
  const user = await getSessionUser();
  if (!user?.email) return null;
  const cached = viewerIds.get(user.email.toLowerCase());
  if (cached) return cached;
  return (await getMember())?.viewer.id ?? null;
}

/** Profile fields the member can edit; stored as viewer traits. */
export const PROFILE_FIELDS = ["business_name", "website", "business_description"] as const;
export type ProfileField = (typeof PROFILE_FIELDS)[number];

export async function saveProfile(member: GymMember, input: Partial<Record<ProfileField, string>>) {
  const context = await getTenantContext();
  if (!context) throw new Error("Tenant not found");
  // Traits are replaced wholesale by the API, so merge onto what's there
  const traits: Record<string, unknown> = { ...(member.viewer.traits ?? {}) };
  for (const key of PROFILE_FIELDS) {
    const value = input[key];
    if (typeof value !== "string") continue;
    const trimmed = value.trim().slice(0, key === "business_description" ? 6000 : 300);
    if (trimmed) traits[key] = trimmed;
    else delete traits[key];
  }
  const { data } = await context.client.viewers.update(member.viewer.id, { name: member.name, traits });
  return data;
}

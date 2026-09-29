import "server-only";

import { cookies } from "next/headers";
import { createHash, createHmac, randomUUID, timingSafeEqual } from "crypto";

/**
 * Who may continue a conversation. Only the person who started it: shared
 * /ask/<id> links are read-only for everyone else, enforced here rather than
 * in the UI.
 *
 * Until viewers log in, a member is an anonymous id in an httpOnly cookie.
 * When a conversation starts, the stream hands the asker an owner token:
 * HMAC(conversationId : memberId). Every follow-up must present a token that
 * matches both the conversation and the caller's cookie, so a shared link, a
 * copied token or a copied cookie alone are all useless. Nothing is stored
 * server-side.
 */

const MEMBER_COOKIE = "gym_uid";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function key(): Buffer {
  const secret =
    process.env.GYM_OWNERSHIP_SECRET ||
    process.env.BOLD_API_KEY ||
    process.env.BOLD_PLATFORM_KEY;
  if (!secret) throw new Error("No secret available for conversation ownership");
  return createHash("sha256").update(`gym-ownership:v1:${secret}`).digest();
}

export interface Member {
  id: string;
  /** True when the cookie must be set on this response */
  isNew: boolean;
}

export async function getMember(): Promise<Member> {
  const existing = (await cookies()).get(MEMBER_COOKIE)?.value;
  if (existing && UUID_RE.test(existing)) return { id: existing, isNew: false };
  return { id: randomUUID(), isNew: true };
}

export function memberCookie(member: Member): string | null {
  if (!member.isNew) return null;
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${MEMBER_COOKIE}=${member.id}; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax${secure}`;
}

export function ownerToken(conversationId: string, memberId: string): string {
  return createHmac("sha256", key()).update(`${conversationId}:${memberId}`).digest("base64url");
}

export function isOwner(conversationId: string, memberId: string, token: unknown): boolean {
  if (typeof token !== "string" || !token) return false;
  const expected = Buffer.from(ownerToken(conversationId, memberId));
  const given = Buffer.from(token);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/** The reply a shared-link visitor gets when they try to add a rep. */
export function notOwnerResponse(): Response {
  const message = "This set belongs to someone else. Ask your own question to start yours.";
  return new Response(
    JSON.stringify({ type: "error", code: "NOT_OWNER", message, content: message }),
    { status: 403, headers: { "Content-Type": "application/json; charset=utf-8" } }
  );
}

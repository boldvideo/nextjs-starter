import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookies } from "next/headers";

const PORTAL_SESSION_COOKIE = "portal_session";
const JWT_EXPIRY = "24h";

function getSecret(): Uint8Array {
  const secret = process.env.PORTAL_AUTH_SECRET || process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("PORTAL_AUTH_SECRET or AUTH_SECRET must be set");
  }
  return new TextEncoder().encode(secret);
}

export interface PortalSessionPayload extends JWTPayload {
  tenant: string;
  iat: number;
  exp: number;
}

export async function createPortalSession(tenant: string): Promise<string> {
  const secret = getSecret();

  return new SignJWT({ tenant })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRY)
    .sign(secret);
}

export async function verifyPortalSession(
  token: string,
  expectedTenant: string
): Promise<PortalSessionPayload | null> {
  try {
    const secret = getSecret();
    const { payload } = await jwtVerify(token, secret);

    if (payload.tenant !== expectedTenant) {
      return null;
    }

    return payload as PortalSessionPayload;
  } catch {
    return null;
  }
}

export async function setPortalSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(PORTAL_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
    maxAge: 60 * 60 * 24,
  });
}

export async function getPortalSessionCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(PORTAL_SESSION_COOKIE)?.value;
}

export async function clearPortalSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(PORTAL_SESSION_COOKIE);
}

export function isPortalAuthRequired(settings: unknown): boolean {
  if (!settings || typeof settings !== "object") {
    return false;
  }

  const s = settings as Record<string, unknown>;
  const portal = s.portal as Record<string, unknown> | undefined;
  const auth = portal?.auth as Record<string, unknown> | undefined;

  return auth?.required === true;
}

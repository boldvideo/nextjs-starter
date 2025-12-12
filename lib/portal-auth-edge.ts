import { jwtVerify, type JWTPayload } from "jose";
import type { NextRequest } from "next/server";

const PORTAL_SESSION_COOKIE = "portal_session";

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

export async function verifyPortalSessionEdge(
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

export function getPortalSessionFromRequest(req: NextRequest): string | null {
  return req.cookies.get(PORTAL_SESSION_COOKIE)?.value ?? null;
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

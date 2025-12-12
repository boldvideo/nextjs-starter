import { NextResponse } from "next/server";
import { clearPortalSessionCookie } from "@/lib/portal-auth";

export async function POST() {
  try {
    await clearPortalSessionCookie();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Portal Auth] Logout error:", error);
    return NextResponse.json(
      { error: "Logout failed" },
      { status: 500 }
    );
  }
}

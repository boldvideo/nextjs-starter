import { getMember, PROFILE_FIELDS, saveProfile, type ProfileField } from "@/lib/gym-viewer";

// The signed-in member's profile (Bold viewer traits). Never cached.
export const dynamic = "force-dynamic";

function profileOf(traits: Record<string, unknown> | undefined) {
  const profile: Partial<Record<ProfileField, string>> = {};
  for (const key of PROFILE_FIELDS) {
    const v = traits?.[key];
    if (typeof v === "string") profile[key] = v;
  }
  return profile;
}

export async function GET() {
  const member = await getMember();
  if (!member) return Response.json({ signedIn: false });
  return Response.json({
    signedIn: true,
    name: member.name,
    email: member.email,
    image: member.image ?? null,
    memberSince: member.viewer.insertedAt,
    memberNo: member.viewer.id.slice(0, 6).toUpperCase(),
    profile: profileOf(member.viewer.traits as Record<string, unknown> | undefined),
  });
}

export async function POST(request: Request) {
  const member = await getMember();
  if (!member) return Response.json({ error: "Sign in first" }, { status: 401 });
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const input: Partial<Record<ProfileField, string>> = {};
  for (const key of PROFILE_FIELDS) {
    if (typeof body[key] === "string") input[key] = body[key] as string;
  }
  try {
    const viewer = await saveProfile(member, input);
    return Response.json({ ok: true, profile: profileOf(viewer.traits as Record<string, unknown> | undefined) });
  } catch (error) {
    console.error("[gym] profile save failed", error);
    return Response.json({ error: "Couldn't save your profile. Try again." }, { status: 500 });
  }
}

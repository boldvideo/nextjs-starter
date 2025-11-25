import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tags, secret } = body;

    // Verify webhook secret (optional but recommended)
    if (process.env.REVALIDATE_SECRET && secret !== process.env.REVALIDATE_SECRET) {
      return NextResponse.json({ message: "Invalid secret" }, { status: 401 });
    }

    // Validate tags array
    if (!tags || !Array.isArray(tags)) {
      return NextResponse.json(
        { message: "Tags array is required" },
        { status: 400 }
      );
    }

    // Revalidate each tag
    // Next.js 16 requires a second argument for cacheLife profile
    // "max" profile triggers immediate expiration
    for (const tag of tags) {
      revalidateTag(tag, "max");
      console.log(`Revalidated tag: ${tag}`);
    }

    return NextResponse.json({
      revalidated: true,
      tags,
      now: Date.now(),
    });
  } catch (error) {
    console.error("Revalidation error:", error);
    return NextResponse.json(
      { message: "Error revalidating" },
      { status: 500 }
    );
  }
}

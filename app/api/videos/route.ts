import { getTenantContext } from "@/lib/get-tenant-context";

export const dynamic = "force-dynamic";

/**
 * Paginated video listing for the homepage "Load more" button.
 * Proxies to the SDK's index endpoint: page is 1-indexed, page size is
 * server-controlled, and an optional tag scopes the list to one topic.
 */
export async function GET(request: Request) {
  const context = await getTenantContext();
  if (!context) {
    return Response.json({ error: "Tenant not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const tag = searchParams.get("tag") || undefined;

  try {
    const response = await context.client.videos.list({
      page,
      ...(tag ? { tag } : {}),
    });
    return Response.json({ data: response?.data ?? [] });
  } catch {
    return Response.json({ error: "Failed to fetch videos" }, { status: 500 });
  }
}

import { getTenantContext } from "@/lib/get-tenant-context";
import { PlaylistVideoList } from "@/components/playlist-video-list";
import { PlaylistMetadataSidebar } from "@/components/playlist-metadata-sidebar";
import { SponsorBox } from "@/components/sponsor-box";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export async function generateStaticParams() {
  // Static generation requires a consistent client - skip for now in multitenancy
  // This could be enhanced to generate params per-tenant in hosted mode
  return [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const context = await getTenantContext();
  if (!context) return {};

  const { data: playlist } = await context.client.playlists.get(resolvedParams.id);
  const first = playlist.videos[0];
  return {
    title: playlist.title,
    description: playlist.description,
    openGraph: {
      title: playlist.title,
      description: playlist.description,
      images: [
        {
          url: `https://og.boldvideo.io/api/og-image?text=${encodeURIComponent(
            playlist.title
          )}${first ? `&img=${encodeURIComponent(first.thumbnail)}` : ""}`,
          width: 1200,
          height: 630,
        },
      ],
    },
  };
}

export default async function PlaylistPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const context = await getTenantContext();
  if (!context) notFound();

  const { data: playlist } = await context.client.playlists.get(resolvedParams.id);

  if (!playlist) notFound();

  const isSponsoredBy = (sponsor: string): boolean => {
    console.log(`Checking if playlist is sponsored by ${sponsor}`);
    return playlist.description?.toLowerCase().includes(sponsor) || false;
  };

  return (
    <div className="p-5 md:p-10 pb-20 md:pb-24 max-w-screen-2xl w-full overflow-y-auto">
      <div className="flex flex-col lg:flex-row gap-6 max-w-6xl mx-auto">
        {/* Main Content Column */}
        <div className="flex-1 min-w-0 max-w-3xl">
          <header className="mb-8">
            <h1 className="font-bold text-3xl mb-5">{playlist.title}</h1>
            {playlist.description && (
              <>
                {isSponsoredBy("webflow") ? (
                  <SponsorBox sponsor="webflow" />
                ) : isSponsoredBy("lemonsqueezy") ? (
                  <SponsorBox sponsor="lemonsqueezy" />
                ) : (
                  <div className="text-lg text-muted-foreground prose prose-lg prose-neutral dark:prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {playlist.description}
                    </ReactMarkdown>
                  </div>
                )}
              </>
            )}
          </header>

          {/* Video List - in main column */}
          <PlaylistVideoList
            videos={playlist.videos}
            playlistId={playlist.id}
          />
        </div>

        {/* Sidebar - Metadata - Hidden on mobile */}
        <aside className="hidden lg:block w-80 flex-shrink-0">
          <div className="sticky top-6">
            <PlaylistMetadataSidebar playlist={playlist} />
          </div>
        </aside>
      </div>
    </div>
  );
}

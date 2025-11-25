import { bold } from "@/client";
import { PlaylistVideoList } from "@/components/playlist-video-list";
import { PlaylistMetadataSidebar } from "@/components/playlist-metadata-sidebar";
import { SponsorBox } from "@/components/sponsor-box";
import type { Playlist, Video } from "@boldvideo/bold-js";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export async function generateStaticParams() {
  try {
    const { data: playlists } = await bold.playlists.list();
    
    return playlists.map((playlist) => ({
      id: playlist.id,
    }));
  } catch (error) {
    console.warn("Could not fetch playlists for static generation:", error);
    // Return empty array to skip static generation if API is not available
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const { data: playlist } = await bold.playlists.get(resolvedParams.id);
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
            playlist.title,
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
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = await params;
  const { data: playlist } = await bold.playlists.get(resolvedParams.id);

  if (!playlist) notFound();

  const isSponsoredBy = (sponsor: string): boolean => {
    console.log(`Checking if playlist is sponsored by ${sponsor}`);
    return playlist.description?.toLowerCase().includes(sponsor) || false;
  };

  return (
    <div className="p-5 md:p-10 pb-20 md:pb-24 max-w-screen-2xl w-full">
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

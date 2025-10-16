import { bold } from "@/client";
import { PlaylistVideoList } from "@/components/playlist-video-list";
import { PlaylistMetadataSidebar } from "@/components/playlist-metadata-sidebar";
import type { Playlist, Video } from "@boldvideo/bold-js";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export async function generateStaticParams() {
  const { data: playlists } = await bold.playlists.list();

  return playlists.map((playlist) => ({
    id: playlist.id,
  }));
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

  return (
    <div className="p-5 md:p-10 pb-20 md:pb-24 max-w-screen-2xl mx-auto">
      {/* Header + Sidebar Layout */}
      <div className="flex flex-col lg:flex-row gap-6 max-w-6xl mx-auto mb-8">
        {/* Header Content */}
        <div className="flex-1 min-w-0 max-w-3xl">
          <header>
            <h1 className="font-bold text-3xl mb-5">{playlist.title}</h1>
            {playlist.description && (
              <div className="text-lg text-muted-foreground prose prose-lg prose-neutral dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {playlist.description}
                </ReactMarkdown>
              </div>
            )}
          </header>
        </div>

        {/* Sidebar - Metadata - Hidden on mobile */}
        <aside className="hidden lg:block w-80 flex-shrink-0">
          <div className="sticky top-6">
            <PlaylistMetadataSidebar playlist={playlist} />
          </div>
        </aside>
      </div>

      {/* Video List - Full Width */}
      <div className="max-w-6xl mx-auto">
        <div className="max-w-3xl">
          <PlaylistVideoList
            videos={playlist.videos}
            playlistId={playlist.id}
          />
        </div>
      </div>
    </div>
  );
}

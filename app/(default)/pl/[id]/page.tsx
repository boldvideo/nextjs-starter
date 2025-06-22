import { bold } from "@/client";
import { VideoThumbnail } from "@/components/video-thumbnail";
import type { Playlist, Video } from "@boldvideo/bold-js";
import { notFound } from "next/navigation";

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

  if (!playlist) notFound(); // 404 route

  const hasVideos = playlist.videos.length > 0;

  return (
    <div className="p-5 md:p-10 max-w-screen-2xl mx-auto">
      <header className="mb-8">
        <h2 className="font-bold text-3xl mb-5">{playlist.title}</h2>
        {playlist.description && (
          <p className="text-lg text-muted-foreground max-w-3xl">
            {playlist.description}
          </p>
        )}
      </header>

      {hasVideos ? (
        <ul className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 md:gap-10">
          {playlist.videos.map((v) => (
            <li key={v.id}>
              <VideoThumbnail video={v} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-12 text-lg text-muted-foreground">
          No videos in this playlist
        </p>
      )}
    </div>
  );
}

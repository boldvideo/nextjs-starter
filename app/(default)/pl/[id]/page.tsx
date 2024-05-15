import { bold } from "@/client";
import { VideoThumbnail } from "@/components/video-thumbnail";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export async function generateMetadata({ params }: { params: { id: string } }) {
  const { data: playlist } = await bold.playlists.get(params.id);
  const videos = playlist.videos;
  return {
    title: playlist.title,
    description: playlist.description,
    openGraph: {
      title: playlist.title,
      images: [
        {
          url: `https://demo.bold.video/og?t=${encodeURIComponent(
            `Playlist: ${playlist.title}`
          )}&img=${encodeURIComponent(videos[0].thumbnail)}`,
          width: 1200,
          height: 630,
        },
      ],
    },
  };
}

export default async function Page({ params }: any) {
  const { data: playlist } = await bold.playlists.get(params.id);
  return (
    <div>
      <h2 className="font-bold text-3xl mb-5">{playlist.title}</h2>
      <p className="mb-10 text-lg max-w-3xl">{playlist.description}</p>
      <ul className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 md:gap-10">
        {playlist.videos.map((vid: any) => (
          <li key={vid.id}>
            <VideoThumbnail video={vid} />
          </li>
        ))}
      </ul>
    </div>
  );
}

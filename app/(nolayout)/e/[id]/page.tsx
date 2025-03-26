import { bold } from "@/client";
// import { Player } from "components/embed-player";
import { Player } from "components/player";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export async function generateMetadata(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { data: video } = await bold.videos.get(params.id);
  return {
    title: video.title,
    description: video.description,
    openGraph: {
      title: video.title,
      images: [
        {
          url: `https://demo.bold.video/og?t=${encodeURIComponent(video.title)}&img=${encodeURIComponent(video.thumbnail)}`,
          width: 1200,
          height: 630,
        },
      ],
    },
  };
}

export default async function EmbedPage(props: any) {
  const params = await props.params;
  const { data: video } = await bold.videos.get(params.id);

  if (!video) return <p>loading</p>;

  return (
    <div className="bg-black m-0 p-0 w-screen h-screen overflow-hidden">
      <Player video={video} autoPlay={false} />
    </div>
  );
}

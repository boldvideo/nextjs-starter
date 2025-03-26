import { bold } from "@/client";
import { VideoDetail } from "@/components/video-detail";

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

export default async function VideoPage(props: any) {
  const params = await props.params;
  const { data: video } = await bold.videos.get(params.id);

  if (!video) return <p>loading</p>;

  return <VideoDetail video={video} />;
}

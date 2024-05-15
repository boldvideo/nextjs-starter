import { bold } from "@/client";
import { Video } from "@boldvideo/bold-js"
import { VideoThumbnail } from "@/components/video-thumbnail";

export default async function () {
  const { data: result } = await bold.videos.search('google+drive');
  console.log('result', result)
  return (
    <div>
      <h2 className="font-bold text-3xl mb-5">Search</h2>
      <ul className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 md:gap-10">
        {result.map((vid: any) => (
          <li key={vid.id}>
            <VideoThumbnail video={vid} />
          </li>
        ))}
      </ul>
    </div>
  );
}

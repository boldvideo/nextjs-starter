import Link from "next/link";
import Image from "next/image";
import { formatRelative } from "date-fns/formatRelative";
import { formatDuration } from "util/format-duration";

export function VideoThumbnail({ video }: { video: any }) {
  return (
    <div className="aspect-video group relative ">
      <div className="aspect-video relative overflow-hidden">
        <Image
          src={video.thumbnail}
          alt={video.title}
          fill={true}
          className="object-cover"
          sizes="100vw, (max-width: 640px) 640px"
        />
        <span className="bg-black text-white absolute px-2 py-1 font-semibold text-sm bottom-3 right-3 rounded">
          {formatDuration(video.duration)}
        </span>
      </div>
      <h3 className="mt-4 font-semibold text-lg">
        <Link href={`/v/${video.id}`}>
          <span className="absolute -inset-2.5 z-10"></span>
          <span>{video.title}</span>
        </Link>
      </h3>
      <p className="text-gray-500 text-sm">
        {formatRelative(new Date(video.published_at), new Date())}
      </p>
    </div>
  );
}

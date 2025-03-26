import React from "react";
import Link from "next/link";
import { bold } from "client";
import { VideoThumbnail } from "components/video-thumbnail";

export const revalidate = 60;

export default async function Home() {
  const { data: settings } = await bold.settings();
  const videos = await bold.videos.list();
  console.log("videos", videos);

  return (
    <div className="p-5 md:p-10 max-w-screen-2xl mx-auto">
      <h2 className="font-bold text-3xl mb-5">Latest Videos</h2>
      <ul className="mb-16 grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 md:gap-10">
        {videos.data.map((vid) => (
          <li key={vid.id}>
            <VideoThumbnail video={vid} />
          </li>
        ))}
      </ul>

      {settings.featured_playlists.map((pl) => {
        return (
          <React.Fragment key={pl.id}>
            <div className="flex justify-between items-center mb-5">
              <h2 className="font-bold text-3xl">
                <Link href={`/pl/${pl.id}`} className="flex items-center">
                  <span className="hover:text-primary">{pl.title}</span>
                  <span className="font-normal text-base text-white ml-3 px-3 py-1 border-gray-200 hover:border-gray-600 hover:text-gray-800 hover:cursor-pointer border rounded-full">
                    {pl.videos.length} Videos
                  </span>
                </Link>
              </h2>
              <Link
                href={`/pl/${pl.id}`}
                className="font-bold text-[18px] text-primary px-3 py-1 border-2 border-primary rounded-lg"
              >
                View All
              </Link>
            </div>
            <ul className="mb-16 grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 md:gap-10">
              {pl.videos.map((vid) => (
                <li key={vid.id}>
                  <VideoThumbnail video={vid} />
                </li>
              ))}
            </ul>
          </React.Fragment>
        );
      })}
    </div>
  );
}

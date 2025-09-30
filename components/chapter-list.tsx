import Image from "next/image";
import { timestampToSeconds, secondsToReadableTime } from "@/lib/utils/time"; // Import helpers

/**
 * Chapter data structure
 */
interface Chapter {
  startTime: string; // Readable format (MM:SS)
  startTimeSeconds: number; // Time in seconds
  title: string;
}

/**
 * Props for the ChapterList component
 */
interface ChapterListProps {
  chaptersWebVTT: string | null | undefined;
  playbackId: string;
  onChapterClick: (timeInSeconds: number) => void;
}

/**
 * Parse WEBVTT chapters format into Chapter objects
 */
const parseChapters = (webvttString: string | null | undefined): Chapter[] => {
  if (!webvttString || !webvttString.includes("WEBVTT")) return [];

  // Match chapter blocks using regex for more robustness
  const chapterRegex =
    /(\d{2}:\d{2}:\d{2}\.\d{3}|\d{2}:\d{2}\.\d{3}) --> .*\n(.+)/g;
  const chapters: Chapter[] = [];
  let match;

  while ((match = chapterRegex.exec(webvttString)) !== null) {
    const startTimeString = match[1]; // e.g., "00:00:15.200" or "00:15.200"
    const title = match[2].trim();
    const startTimeSeconds = timestampToSeconds(startTimeString);
    const readableStartTime = secondsToReadableTime(startTimeSeconds);

    chapters.push({
      startTime: readableStartTime,
      startTimeSeconds: startTimeSeconds,
      title: title,
    });
  }

  return chapters;
};

/**
 * Renders a list of video chapters from WEBVTT data.
 */
export function ChapterList({
  chaptersWebVTT,
  playbackId,
  onChapterClick,
}: ChapterListProps): React.JSX.Element | null {
  const chapters = parseChapters(chaptersWebVTT);

  if (!chapters || chapters.length === 0) {
    return null; // Don't render anything if no chapters
  }

  return (
    <div className="bg-sidebar flex flex-col h-full">
      <h3 className="p-3 font-bold text-base border-b border-border flex-shrink-0">Chapters</h3>
      <ol className="overflow-y-auto flex-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] pb-6">
        {chapters.map((chapter, idx) => (
            <li
              key={chapter.startTimeSeconds}
              onClick={() => onChapterClick(chapter.startTimeSeconds)}
              className="group cursor-pointer p-2.5 hover:bg-accent transition-colors border-b border-border last:border-b-0"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  onChapterClick(chapter.startTimeSeconds);
                }
              }}
            >
              <div className="flex gap-2.5">
                <div className="relative w-24 h-14 flex-shrink-0 overflow-hidden rounded">
                  <Image
                    src={`https://image.mux.com/${playbackId}/thumbnail.png?width=200&height=112&fit_mode=smartcrop&time=${chapter.startTimeSeconds}`}
                    alt={`Thumbnail for chapter: ${chapter.title}`}
                    fill={true}
                    sizes="96px"
                    style={{ objectFit: "cover" }}
                    className="group-hover:brightness-110 transition-all duration-200"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                  {/* Chapter number badge */}
                  <div className="absolute top-1 left-1 bg-black/80 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded">
                    {idx + 1}
                  </div>
                  {/* Timestamp badge */}
                  <div className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] font-medium px-1.5 py-0.5 rounded">
                    {chapter.startTime}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                    {chapter.title}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ol>
    </div>
  );
}

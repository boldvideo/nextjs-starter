import {
  Transcript as TranscriptWrapper,
  TranscriptContent,
  TranscriptHeader,
  TranscriptTitle,
  useTranscript,
  Utterance,
  UtteranceItem,
  UtteranceLabel,
  UtteranceSpeaker,
  formatTimestamp,
} from "@boldvideo/ui";
import { TimestampPill } from "./timestamp-pill";
import { useMemo, useState } from "react";
import type { JSX } from "react";
import { Search, X } from "lucide-react";

function buildSearchRegexes(query: string, flags: string): RegExp[] {
  const q = query.trim();
  if (!q) return [];

  const terms = q.split(/\s+/);

  try {
    return terms.map((t) => new RegExp(t, flags));
  } catch {
    // Fallback: escape invalid regex characters and retry
    const escaped = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    return escaped.map((t) => new RegExp(t, flags));
  }
}

function highlightMatches(text: string, regexes: RegExp[]) {
  if (!regexes.length || !text) return text;

  const ranges: { start: number; end: number }[] = [];

  for (const re of regexes) {
    // make sure we always start from 0 for each text
    re.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = re.exec(text)) !== null) {
      const matchText = match[0];
      if (!matchText) {
        // avoid infinite loops on zero-length matches
        re.lastIndex++;
        continue;
      }
      const start = match.index;
      const end = start + matchText.length;
      if (end > start) {
        ranges.push({ start, end });
      }
    }
  }

  if (!ranges.length) return text;

  // Sort and merge overlapping ranges
  ranges.sort((a, b) => a.start - b.start || a.end - b.end);
  const merged: { start: number; end: number }[] = [];
  for (const range of ranges) {
    const last = merged[merged.length - 1];
    if (!last || range.start > last.end) {
      merged.push({ ...range });
    } else {
      last.end = Math.max(last.end, range.end);
    }
  }

  const parts: (string | JSX.Element)[] = [];
  let lastIndex = 0;

  merged.forEach((range, i) => {
    if (range.start > lastIndex) {
      parts.push(text.slice(lastIndex, range.start));
    }
    parts.push(
      <mark
        key={i}
        className="bg-primary text-primary-foreground rounded-sm px-0.5"
      >
        {text.slice(range.start, range.end)}
      </mark>
    );
    lastIndex = range.end;
  });

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

export function Transcript({
  url,
  playerRef,
  onCueClick,
}: {
  url: string;
  playerRef: React.RefObject<HTMLVideoElement | null>;
  onCueClick?: (time: number) => void;
}) {
  const { transcript, activeUtteranceIndex, isLoading } = useTranscript({
    url,
    playerRef,
  });

  const [searchQuery, setSearchQuery] = useState("");

  const { filterRegexes, highlightRegexes } = useMemo(() => {
    return {
      // used for AND filtering
      filterRegexes: buildSearchRegexes(searchQuery, "i"),
      // used for highlighting (global + case-insensitive)
      highlightRegexes: buildSearchRegexes(searchQuery, "gi"),
    };
  }, [searchQuery]);

  const filteredUtterances = useMemo(() => {
    if (!transcript) return [];
    const base = transcript.utterances.map((u, index) => ({ u, index }));

    if (!filterRegexes.length) return base;

    // AND semantics: all words must match somewhere in the utterance text
    return base.filter(({ u }) => filterRegexes.every((re) => re.test(u.text)));
  }, [transcript, filterRegexes]);

  if (isLoading) return <p className="text-muted">Loading transcript…</p>;
  if (!transcript) return null;

  return (
    <TranscriptWrapper>
      <TranscriptHeader className="sticky top-0 z-10 flex items-center justify-between bg-background/95 backdrop-blur pt-0 pb-4 mb-2 lg:py-4 lg:mb-8 lg:border-b">
        <TranscriptTitle className="text-base lg:text-2xl font-bold">
          Transcript{" "}
          <span className="text-gray-400 text-xs lg:text-sm">(auto-generated)</span>
        </TranscriptTitle>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setSearchQuery("");
                e.currentTarget.blur();
              }
            }}
            className="pl-8 pr-8 h-9 text-sm bg-background border border-input focus:border-primary rounded-lg outline-none transition-all w-32 focus:w-48 placeholder:text-muted-foreground/70"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-sm hover:bg-background/50 transition-colors"
              aria-label="Clear search"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </TranscriptHeader>
      <TranscriptContent>
        {filteredUtterances.map(({ u, index }) => (
          <UtteranceItem
            key={index}
            active={index === activeUtteranceIndex}
            onClick={() => onCueClick?.(u.start)}
          >
            <UtteranceLabel>
              <UtteranceSpeaker>
                {transcript.metadata.speakers[u.speaker] ??
                  `Speaker ${u.speaker}`}
              </UtteranceSpeaker>
              <TimestampPill
                timestamp={formatTimestamp(u.start)}
                onClick={(e) => {
                  e.stopPropagation();
                  onCueClick?.(Math.max(0, u.start - 1));
                }}
              />
            </UtteranceLabel>
            <Utterance
              className={`text-lg hover:bg-primary/10 ${
                index === activeUtteranceIndex ? "bg-primary/10" : ""
              }`}
            >
              {highlightMatches(u.text, highlightRegexes)}
            </Utterance>
          </UtteranceItem>
        ))}
        {filteredUtterances.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            No matches found for &quot;{searchQuery}&quot;
          </div>
        )}
      </TranscriptContent>
    </TranscriptWrapper>
  );
}

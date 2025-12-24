import { AskCitation, formatAskTime } from "./ask";

// Legacy fields that may come from API for backwards compatibility
interface LegacyCitationFields {
  title?: string;
  timestamp?: number;
}

type RawCitation = Partial<AskCitation> & LegacyCitationFields;

/**
 * Creates placeholder citations for citation references found in text
 * Used while real citation data is loading
 */
export function createPlaceholderCitations(text: string): AskCitation[] {
  const citationMatches = text.match(/\[\d+\]/g);
  if (!citationMatches) return [];

  return Array.from(new Set(citationMatches)).map(match => {
    const num = parseInt(match.replace(/[\[\]]/g, ''));
    return {
      id: `placeholder_${num}`,
      relevanceScore: 0.5,
      relevanceRank: num,
      videoId: `pending_${num}`,
      playbackId: "",
      videoTitle: "Loading...",
      timestampStart: "00:00",
      timestampEnd: "00:00",
      startMs: 0,
      endMs: 0,
      speaker: "Loading...",
      text: "Citation details loading...",
      transcriptExcerpt: "Citation details loading..."
    };
  });
}

/**
 * Processes raw citation data to ensure all required fields are present
 */
export function processCitations(rawCitations: RawCitation[]): AskCitation[] {
  return rawCitations.map((c, idx) => {
    // Handle legacy/mismatched fields for robustness
    const videoTitle = c.videoTitle || c.title || "Untitled";

    // Handle time fields - prioritize startMs, fallback to timestamp (seconds)
    let startMs = c.startMs || 0;
    if (!startMs && c.timestamp) {
      startMs = c.timestamp * 1000;
    }

    // Ensure formatted string exists
    const timestampStart = c.timestampStart || formatAskTime(startMs / 1000);

    // Get text/transcript
    const text = c.text || c.transcriptExcerpt || "";

    return {
      id: c.id || `${c.videoId}_${startMs}`,
      relevanceScore: c.relevanceScore ?? 0.5,
      relevanceRank: c.relevanceRank ?? (idx + 1),
      videoId: c.videoId || "",
      playbackId: c.playbackId || "",
      timestampStart: timestampStart,
      timestampEnd: c.timestampEnd || "",
      videoTitle: videoTitle,
      speaker: c.speaker || "Speaker",
      text: text,
      transcriptExcerpt: text, // Keep alias synced
      startMs: startMs,
      endMs: c.endMs || 0
    };
  });
}

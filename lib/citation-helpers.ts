import { AskCitation, formatAskTime } from "./ask";

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
      relevance_score: 0.5,
      relevance_rank: num,
      video_id: `pending_${num}`,
      playback_id: "",
      video_title: "Loading...",
      timestamp_start: "00:00",
      timestamp_end: "00:00",
      start_ms: 0,
      end_ms: 0,
      speaker: "Loading...",
      transcript_excerpt: "Citation details loading..."
    };
  });
}

/**
 * Processes raw citation data to ensure all required fields are present
 */
export function processCitations(rawCitations: Partial<AskCitation>[]): AskCitation[] {
  return rawCitations.map((c, idx) => {
    // Handle legacy/mismatched fields for robustness
    const videoTitle = c.video_title || (c as any).title || "Untitled";
    
    // Handle time fields - prioritize start_ms, fallback to timestamp (seconds)
    let startMs = c.start_ms || 0;
    if (!startMs && (c as any).timestamp) {
      startMs = (c as any).timestamp * 1000;
    }
    
    // Ensure formatted string exists
    const timestampStart = c.timestamp_start || formatAskTime(startMs / 1000);

    return {
      id: c.id || `${c.video_id}_${startMs}`,
      relevance_score: c.relevance_score ?? 0.5,
      relevance_rank: c.relevance_rank ?? (idx + 1),
      video_id: c.video_id || "",
      playback_id: c.playback_id || "",
      timestamp_start: timestampStart,
      timestamp_end: c.timestamp_end || "",
      video_title: videoTitle,
      speaker: c.speaker || "Speaker",
      transcript_excerpt: c.transcript_excerpt || "",
      start_ms: startMs,
      end_ms: c.end_ms || 0
    };
  });
}
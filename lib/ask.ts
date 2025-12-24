// Types for the ask API response

export type AskCitation = {
  // API v2.0 citation format
  id: string;  // Unique identifier like "vid1_5000"
  relevanceScore: number;  // 0.0 to 1.0
  relevanceRank: number;  // 1 = most relevant, 2 = second most, etc.
  videoId: string;
  playbackId: string;
  videoTitle: string;
  timestampStart: string;  // "00:05" format
  timestampEnd: string;    // "07:45" format
  startMs: number;
  endMs: number;
  speaker: string;
  text: string; // The relevant transcript excerpt
  transcriptExcerpt: string; // Backwards compatibility or alias
};

export type AskAnswer = {
  text: string;
  citations: AskCitation[];
  confidence: "high" | "medium" | "low";
  limitations?: string | null;
  modelUsed: string;
};

export type AskChunk = {
  id: string;
  text: string;
  videoId: string;
  playbackId?: string;
  videoTitle?: string;
  speaker: string;
  timestampStartMs: number;
  timestampEndMs: number;
  durationMs: number | null;
  highlightedText: string;
  rrfScore: number;
  appearanceCount?: number;
};

export type AskRetrieval = {
  total: number;
  chunks: AskChunk[];
};

// Clarification response type
export type ClarificationResponse = {
  success: true;
  mode: "clarification";
  needsClarification: true;
  clarifyingQuestions: string[];
  missingDimensions: string[];
  originalQuery: string;
  conversationId: string;
};

// Synthesized answer response type
export type SynthesizedResponse = {
  success: true;
  mode: "synthesized";
  query: string;
  expandedQueries: string[];
  conversationId: string;
  answer: AskAnswer;
  retrieval: AskRetrieval;
  processingTimeMs: number;
};

// Retrieval only response type
export type RetrievalOnlyResponse = {
  success: true;
  mode: "retrieval_only";
  query: string;
  expandedQueries: string[];
  retrieval: AskRetrieval;
  processingTimeMs: number;
};

// Error response type
export type ErrorResponse = {
  success: false;
  error: string;
  details?: string;
};

// Union type for all possible responses
export type AskResponse =
  | ClarificationResponse
  | SynthesizedResponse
  | RetrievalOnlyResponse
  | ErrorResponse;

// Helper function to format time from seconds or time string
export function formatAskTime(time: string | number): string {
  // If it's already a formatted string like "07:13", return it
  if (typeof time === "string" && time.includes(":")) {
    return time;
  }

  // Otherwise convert seconds to mm:ss format
  const seconds = typeof time === "string" ? parseInt(time) : time;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

// Helper to convert time string to seconds for video player links
export function timeStringToSeconds(timeStr: string | undefined | null): number {
  if (!timeStr) {
    return 0;
  }

  const parts = timeStr.split(":");
  if (parts.length === 2) {
    const [minutes, seconds] = parts.map(Number);
    return minutes * 60 + seconds;
  }
  return 0;
}

// Type guards for response discrimination
export function isClarificationResponse(
  response: AskResponse
): response is ClarificationResponse {
  return response.success === true &&
         response.mode === "clarification" &&
         "needsClarification" in response;
}

export function isSynthesizedResponse(
  response: AskResponse
): response is SynthesizedResponse {
  return response.success === true &&
         response.mode === "synthesized" &&
         "answer" in response;
}

export function isRetrievalOnlyResponse(
  response: AskResponse
): response is RetrievalOnlyResponse {
  return response.success === true &&
         response.mode === "retrieval_only" &&
         !("answer" in response);
}

export function isErrorResponse(
  response: AskResponse
): response is ErrorResponse {
  return response.success === false;
}

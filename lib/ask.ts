// Types for the ask API response

export type AskCitation = {
  label: string;
  video_id: string;
  mux_playback_id?: string;
  video_title?: string;
  start_time: string;
  end_time: string;
  speaker: string;
  start_ms: number;
  end_ms: number;
};

export type AskAnswer = {
  text: string;
  citations: AskCitation[];
  confidence: "high" | "medium" | "low";
  limitations?: string | null;
  model_used: string;
};

export type AskChunk = {
  id: string;
  text: string;
  video_id: string;
  mux_playback_id?: string;
  video_title?: string;
  speaker: string;
  timestamp_start_ms: number;
  timestamp_end_ms: number;
  duration_ms: number | null;
  highlighted_text: string;
  rrf_score: number;
  appearance_count?: number;
};

export type AskRetrieval = {
  total: number;
  chunks: AskChunk[];
};

// Clarification response type
export type ClarificationResponse = {
  success: true;
  mode: "clarification";
  needs_clarification: true;
  clarifying_questions: string[];
  missing_dimensions: string[];
  original_query: string;
  conversation_id: string;
};

// Synthesized answer response type
export type SynthesizedResponse = {
  success: true;
  mode: "synthesized";
  query: string;
  expanded_queries: string[];
  assumptions_made?: string[];
  conversation_id: string;
  answer: AskAnswer;
  retrieval: AskRetrieval;
  processing_time_ms: number;
};

// Retrieval only response type
export type RetrievalOnlyResponse = {
  success: true;
  mode: "retrieval_only";
  query: string;
  expanded_queries: string[];
  retrieval: AskRetrieval;
  processing_time_ms: number;
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
export function timeStringToSeconds(timeStr: string): number {
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
         "needs_clarification" in response;
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
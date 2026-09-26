import type { AnswerInteraction } from "@/lib/source-engagement";

export type SuggestedAction = {
  id: string;
  label: string;
  value: string;
};

export type ToolCall = {
  name: string;  // e.g., "web_search"
};

export type Message = {
  interaction?: AnswerInteraction;
  interactionId?: string | null;
  role: "user" | "assistant";
  content: string;
  suggested_actions?: SuggestedAction[];
  suggested_actions_prompt?: string;
  selected_action?: string;
  tool_call?: ToolCall;
};

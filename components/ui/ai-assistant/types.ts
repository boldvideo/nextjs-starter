export type SuggestedAction = {
  label: string;
  value: string;
};

export type ToolCall = {
  name: string;  // e.g., "web_search"
};

export type Message = {
  role: "user" | "assistant";
  content: string;
  suggested_actions?: SuggestedAction[];
  tool_call?: ToolCall;
};

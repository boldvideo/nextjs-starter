export type SuggestedAction = {
  id: string;
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
  suggested_actions_prompt?: string;
  selected_action?: string;
  tool_call?: ToolCall;
};

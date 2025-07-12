export type SuggestedAction = {
  label: string;
  value: string;
};

export type Message = {
  role: "user" | "assistant";
  content: string;
  suggested_actions?: SuggestedAction[];
};

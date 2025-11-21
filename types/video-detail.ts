import type { Video } from "@boldvideo/bold-js";

/**
 * CTA type for call-to-action data
 */
export interface CTA {
  id: string;
  name: string;
  description: string;
  title: string;
  button_text?: string;
  button_url?: string;
}

/**
 * Extended Video type with additional properties used in our application
 */
export interface ExtendedVideo extends Omit<Video, "cta"> {
  chapters_url?: string;
  ai_avatar?: string;
  ai_name?: string;
  cta?: CTA | null;
}

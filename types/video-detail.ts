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
export interface ExtendedVideo extends Omit<Video, "cta" | "attachments"> {
  chapters_url?: string;
  ai_avatar?: string;
  ai_name?: string;
  cta?: CTA | null;
  attachments?: {
    id: number;
    description: string | null;
    title: string;
    file_size: number;
    file_url: string;
    mime_type: string;
  }[];
}

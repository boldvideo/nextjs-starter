import type { Video } from "@boldvideo/bold-js";

/**
 * CTA type for call-to-action data
 */
export interface CTA {
  id: string;
  name: string;
  description: string;
  title: string;
  buttonText?: string;
  buttonUrl?: string;
}

/**
 * Extended Video type with additional properties used in our application
 */
export interface ExtendedVideo extends Omit<Video, "cta" | "attachments"> {
  chaptersUrl?: string;
  aiAvatar?: string;
  aiName?: string;
  cta?: CTA | null;
  attachments?: {
    id: number;
    description: string | null;
    title: string;
    fileSize: number;
    fileUrl: string;
    mimeType: string;
  }[];
}

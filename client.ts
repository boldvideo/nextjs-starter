import { createClient } from "@boldvideo/bold-js";

export const bold = createClient(
  process.env.NEXT_PUBLIC_BOLD_API_KEY as string,
  { baseURL: process.env.BACKEND_URL || "", debug: false }
);

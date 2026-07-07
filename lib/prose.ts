import { cn } from "@/lib/utils";

/**
 * The portal's long-form reading style — shared by AI answers and video
 * descriptions so prose reads identically everywhere: 18px/1.72 body in the
 * secondary tone, quiet 20px display-face headings, amber blockquotes.
 */
export const PROSE_CLASS = cn(
  "prose prose-base max-w-none",
  "dark:prose-invert",
  "[&>*:first-child]:mt-0",
  "prose-p:my-4 prose-p:text-lg prose-p:leading-[1.72] prose-p:text-muted-foreground prose-p:text-pretty",
  "prose-li:my-1.5 prose-li:text-lg prose-li:leading-[1.65] prose-li:text-muted-foreground",
  "prose-em:text-foreground prose-strong:font-semibold prose-strong:text-foreground",
  "prose-headings:font-[family-name:var(--font-heading)] prose-headings:font-semibold prose-headings:text-foreground prose-headings:tracking-tight",
  "prose-headings:text-xl prose-headings:mt-7 prose-headings:mb-3 prose-headings:leading-snug",
  "prose-blockquote:border-l-2 prose-blockquote:border-signal prose-blockquote:text-muted-foreground prose-blockquote:font-normal prose-blockquote:not-italic",
  "prose-hr:border-border"
);

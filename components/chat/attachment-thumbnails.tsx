"use client";

import { useState } from "react";
import { ChatAttachment } from "@/hooks/use-ai-ask-stream";
import { AttachmentLightbox } from "./attachment-lightbox";

export function AttachmentThumbnails({
  attachments,
}: {
  attachments: ChatAttachment[];
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  if (attachments.length === 0) return null;
  return (
    <>
      <div className="flex gap-2 flex-wrap mb-2">
        {attachments.map((att, i) => {
          const src = att.url ?? att.localPreviewUrl;
          if (!src) return null;
          return (
            <button
              key={att.id}
              type="button"
              onClick={() => setOpenIndex(i)}
              className="h-20 w-20 rounded-lg overflow-hidden border border-border hover:border-primary transition-colors"
              aria-label={`Open attachment ${att.name ?? i + 1}`}
            >
              {/* Plain img is intentional: blob/server URLs are unsuitable for next/image */}
              <img
                src={src}
                alt={att.name ?? ""}
                className="h-full w-full object-cover"
              />
            </button>
          );
        })}
      </div>
      {openIndex !== null && (
        <AttachmentLightbox
          attachment={attachments[openIndex]}
          onClose={() => setOpenIndex(null)}
        />
      )}
    </>
  );
}

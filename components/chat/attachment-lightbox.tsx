"use client";

import { useEffect } from "react";
import { ChatAttachment } from "@/hooks/use-ai-ask-stream";

export function AttachmentLightbox({
  attachment,
  onClose,
}: {
  attachment: ChatAttachment;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const src = attachment.url ?? attachment.localPreviewUrl;
  if (!src) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Plain img is intentional: blob/server URLs are unsuitable for next/image */}
      <img
        src={src}
        alt={attachment.name ?? ""}
        className="max-h-full max-w-full object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

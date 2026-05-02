"use client";

import React, { useRef, useEffect, useCallback, useState, useMemo } from "react";
import { ArrowUp, Square, Paperclip, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e?: React.FormEvent) => void;
  onStop?: () => void;
  placeholder?: string;
  disabled?: boolean;
  isStreaming?: boolean;
  autoFocus?: boolean;
  suggestions?: string[];
  showSuggestions?: boolean;
  className?: string;
  disclaimer?: string;
  // Multimodal (Phase 2)
  multimodalEnabled?: boolean;
  images?: File[];
  onImagesChange?: (images: File[]) => void;
  maxImages?: number;
  acceptedMediaTypes?: string[];
}

const MAX_HEIGHT = 360; // Max height before scrolling

function ThumbnailRow({
  images,
  onRemove,
}: {
  images: File[];
  onRemove: (index: number) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto px-3 pt-3">
      {images.map((file, i) => {
        const url = URL.createObjectURL(file);
        // Note: revocation handled by parent on submit/clear, not here.
        return (
          <div key={`${file.name}-${i}`} className="relative h-16 w-16 shrink-0">
            {/* Plain <img> is acceptable here; this is a transient blob URL */}
            <img
              src={url}
              alt={file.name}
              className="h-16 w-16 rounded-lg object-cover border border-border"
            />
            <button
              type="button"
              onClick={() => onRemove(i)}
              className="absolute -top-1 -right-1 rounded-full bg-foreground/80 text-background w-5 h-5 flex items-center justify-center hover:bg-foreground"
              aria-label={`Remove ${file.name}`}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export function ChatInput({
  value,
  onChange,
  onSubmit,
  onStop,
  placeholder = "Ask a question...",
  disabled = false,
  isStreaming = false,
  autoFocus = false,
  suggestions = [],
  showSuggestions = false,
  className,
  disclaimer,
  multimodalEnabled = false,
  images: imagesProp,
  onImagesChange,
  maxImages: maxImagesProp,
  acceptedMediaTypes: acceptedMediaTypesProp,
}: ChatInputProps) {
  const [isFocused, setIsFocused] = React.useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const images = useMemo(() => imagesProp ?? [], [imagesProp]);
  const maxImages = maxImagesProp ?? 0;
  const acceptedMediaTypes = useMemo(() => acceptedMediaTypesProp ?? [], [acceptedMediaTypesProp]);

  // Auto-resize textarea
  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto';
    // Set to scrollHeight, capped at MAX_HEIGHT
    const newHeight = Math.min(textarea.scrollHeight, MAX_HEIGHT);
    textarea.style.height = `${newHeight}px`;
  }, []);

  // Auto-focus on mount if requested
  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  // Adjust height when value changes
  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!value.trim() || disabled || isStreaming) return;
    onSubmit(e);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter without Shift
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    onChange(suggestion);
    textareaRef.current?.focus();
  };

  const addImages = useCallback(
    (incoming: File[]) => {
      if (!multimodalEnabled || !onImagesChange) return;

      const accepted: File[] = [];
      let typeRejected = false;
      for (const f of incoming) {
        if (acceptedMediaTypes.length && !acceptedMediaTypes.includes(f.type)) {
          typeRejected = true;
          continue;
        }
        accepted.push(f);
      }

      let next = [...images, ...accepted];
      let capHit = false;
      if (maxImages > 0 && next.length > maxImages) {
        next = next.slice(0, maxImages);
        capHit = true;
      }

      if (typeRejected) {
        setValidationError(
          `Unsupported file type. Allowed: ${acceptedMediaTypes.join(", ")}`
        );
      } else if (capHit) {
        setValidationError(`You can attach at most ${maxImages} images.`);
      } else {
        setValidationError(null);
      }

      onImagesChange(next);
    },
    [multimodalEnabled, onImagesChange, images, maxImages, acceptedMediaTypes]
  );

  const removeImage = useCallback(
    (index: number) => {
      if (!onImagesChange) return;
      const next = images.filter((_, i) => i !== index);
      onImagesChange(next);
      setValidationError(null);
    },
    [images, onImagesChange]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (files.length) addImages(files);
      e.target.value = ""; // reset so same file can be picked again
    },
    [addImages]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      if (!multimodalEnabled) return;
      const items = Array.from(e.clipboardData?.items ?? []);
      const imageFiles = items
        .filter((it) => it.kind === "file" && it.type.startsWith("image/"))
        .map((it) => it.getAsFile())
        .filter((f): f is File => f !== null);
      if (imageFiles.length) {
        e.preventDefault();
        addImages(imageFiles);
      }
    },
    [multimodalEnabled, addImages]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLFormElement>) => {
      if (!multimodalEnabled) return;
      if (Array.from(e.dataTransfer.types).includes("Files")) {
        e.preventDefault();
        setDragOver(true);
      }
    },
    [multimodalEnabled]
  );

  const handleDragLeave = useCallback(() => setDragOver(false), []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLFormElement>) => {
      if (!multimodalEnabled) return;
      e.preventDefault();
      setDragOver(false);
      const files = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith("image/")
      );
      if (files.length) addImages(files);
    },
    [multimodalEnabled, addImages]
  );

  return (
    <div className={cn("w-full", className)}>
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="relative"
        onDragOver={handleDragOver}
        onDragEnter={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div
          className={cn(
            "relative flex flex-col rounded-2xl border transition-all duration-200",
            isFocused
              ? "border-primary shadow-lg shadow-primary/10"
              : "border-border hover:border-primary/50",
            "bg-background"
          )}
        >
          {multimodalEnabled && dragOver && (
            <div className="pointer-events-none absolute inset-0 z-10 rounded-2xl border-2 border-dashed border-primary bg-primary/5 flex items-center justify-center text-primary text-sm">
              Drop images to attach
            </div>
          )}

          {multimodalEnabled && images.length > 0 && (
            <ThumbnailRow images={images} onRemove={removeImage} />
          )}

          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            disabled={disabled || isStreaming}
            rows={1}
            className={cn(
              "w-full px-5 pt-4 pb-2 text-base bg-transparent outline-none resize-none",
              "placeholder:text-muted-foreground/60 transition-all",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "overflow-y-auto"
            )}
            style={{ maxHeight: MAX_HEIGHT }}
            aria-label="Ask your coach a question"
          />

          {/* Bottom row */}
          <div className={cn("flex px-3 pb-3", multimodalEnabled ? "justify-between" : "justify-end")}>
            {multimodalEnabled && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept={acceptedMediaTypes.join(",")}
                  className="hidden"
                  onChange={handleFileInputChange}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={disabled || isStreaming || (maxImages > 0 && images.length >= maxImages)}
                  className={cn(
                    "p-2.5 rounded-xl transition-all duration-200",
                    "border border-border bg-background hover:bg-accent",
                    "text-muted-foreground hover:text-foreground",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                  aria-label="Attach images"
                >
                  <Paperclip className="h-4 w-4" />
                </button>
              </>
            )}
            {isStreaming && onStop ? (
              <button
                type="button"
                onClick={onStop}
                className={cn(
                  "p-2.5 rounded-xl transition-all duration-200",
                  "border border-border bg-background hover:bg-accent",
                  "text-foreground"
                )}
                aria-label="Stop generating"
              >
                <Square className="h-4 w-4 fill-current" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!value.trim() || disabled || isStreaming}
                className={cn(
                  "p-2.5 rounded-xl transition-all duration-200",
                  value.trim() && !disabled && !isStreaming
                    ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                )}
                aria-label="Submit question"
              >
                <ArrowUp className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </form>

      {validationError && (
        <p className="mt-2 text-destructive text-xs px-3">{validationError}</p>
      )}

      {/* Disclaimer */}
      {disclaimer && (
        <div className="mt-3 text-center text-xs text-muted-foreground/70 mx-auto max-w-[80%] [&_a]:underline [&_a]:hover:text-primary [&_strong]:font-semibold">
          <ReactMarkdown>{disclaimer}</ReactMarkdown>
        </div>
      )}

      {/* Suggestions */}
      {showSuggestions && suggestions.length > 0 && !value && (
        <div className="mt-4 flex flex-wrap gap-2 justify-center items-center">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => handleSuggestionClick(suggestion)}
              disabled={disabled || isStreaming}
              className={cn(
                "text-sm px-4 py-2 rounded-full border transition-all duration-200",
                "border-border/60 hover:border-primary/50 hover:bg-primary/5 hover:shadow-sm",
                "text-muted-foreground hover:text-foreground",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

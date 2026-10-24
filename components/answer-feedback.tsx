"use client";

import { useState } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { cn } from "@/lib/utils";

const reasons = [
  ["wrong", "Wrong"],
  ["not_in_video", "Not in the video"],
  ["too_short", "Too short"],
  ["off_topic", "Off topic"],
  ["other", "Other…"],
] as const;

interface Feedback {
  rating: "up" | "down";
  reasons?: string[];
  note?: string;
}

export function AnswerFeedback({ messageId }: { messageId: string }) {
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [pending, setPending] = useState(false);
  const [note, setNote] = useState("");

  const save = async (next: Feedback | null) => {
    const previous = feedback;
    setFeedback(next);
    setPending(true);
    try {
      const response = await fetch(`/api/ai/messages/${encodeURIComponent(messageId)}/feedback`, {
        method: next ? "POST" : "DELETE",
        headers: next ? { "Content-Type": "application/json" } : undefined,
        body: next ? JSON.stringify(next) : undefined,
      });
      if (!response.ok) throw new Error("Feedback failed");
    } catch {
      setFeedback(previous);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="not-prose mt-2 space-y-2">
      <div className="flex items-center gap-1">
        {(["up", "down"] as const).map(rating => {
          const Icon = rating === "up" ? ThumbsUp : ThumbsDown;
          const label = rating === "up" ? "Good answer" : "Bad answer";
          const selected = feedback?.rating === rating;
          return (
            <button
              key={rating}
              type="button"
              title={label}
              aria-label={label}
              aria-pressed={selected}
              disabled={pending}
              onClick={() => void save(selected ? null : { rating })}
              className={cn(
                "rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait",
                selected && "text-foreground"
              )}
            >
              <Icon className="size-4" fill={selected ? "currentColor" : "none"} aria-hidden="true" />
            </button>
          );
        })}
      </div>
      {feedback?.rating === "down" && (
        <>
          <div className="flex flex-wrap gap-1.5">
            {reasons.map(([value, label]) => {
              const selected = feedback.reasons?.includes(value) ?? false;
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={selected}
                  disabled={pending}
                  onClick={() => void save({
                    ...feedback,
                    reasons: selected
                      ? feedback.reasons?.filter(reason => reason !== value)
                      : [...(feedback.reasons ?? []), value],
                    note: value === "other" && selected ? undefined : feedback.note,
                  })}
                  className={cn(
                    "rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait",
                    selected && "bg-muted text-foreground"
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
          {feedback.reasons?.includes("other") && (
            <form
              className="flex gap-2"
              onSubmit={event => {
                event.preventDefault();
                if (!pending) void save({ ...feedback, note: note.trim() });
              }}
            >
              <input
                type="text"
                aria-label="Feedback note"
                placeholder="Tell us more (optional)"
                maxLength={500}
                value={note}
                onChange={event => setNote(event.target.value)}
                className="min-w-0 flex-1 rounded-md border border-input bg-background px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <button type="submit" disabled={pending} className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait">
                Send
              </button>
            </form>
          )}
        </>
      )}
    </div>
  );
}

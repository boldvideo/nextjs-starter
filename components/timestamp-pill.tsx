import { Play } from "lucide-react";
import { MouseEventHandler } from "react";

interface TimestampPillProps {
  timestamp: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  className?: string;
}

export function TimestampPill({ timestamp, onClick, className = "" }: TimestampPillProps) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2 py-0.5 mx-0.5 rounded-full border border-input font-mono text-[11px] tabular-nums text-acid transition-colors hover:border-acid hover:bg-acid hover:text-[#0a0a08] cursor-pointer ${className}`}
    >
      <Play className="w-2.5 h-2.5 fill-current" />
      <span className="pointer-events-none">{timestamp}</span>
    </button>
  );
}

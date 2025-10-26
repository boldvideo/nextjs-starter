import { Play } from "lucide-react";

interface TimestampPillProps {
  timestamp: string;
  onClick?: () => void;
  className?: string;
}

export function TimestampPill({ timestamp, onClick, className = "" }: TimestampPillProps) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2 py-0.5 mx-0.5 rounded-full bg-background border border-primary/30 hover:border-primary hover:bg-primary/5 hover:scale-105 transition-all text-xs cursor-pointer ${className}`}
    >
      <Play className="w-2.5 h-2.5 fill-current" />
      <span className="pointer-events-none">{timestamp}</span>
    </button>
  );
}

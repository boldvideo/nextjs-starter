import { cn } from '@/lib/utils';

interface ProgressBarProps {
  percentWatched: number;
  completed?: boolean;
  className?: string;
}

/**
 * Progress bar overlay for video thumbnails
 * Shows horizontal bar at bottom with filled portion
 */
export function ProgressBar({
  percentWatched,
  completed = false,
  className,
}: ProgressBarProps) {
  // Don't show bar if no progress
  if (percentWatched === 0 && !completed) {
    return null;
  }

  return (
    <div
      className={cn(
        'absolute bottom-0 left-0 right-0 h-1 bg-muted/30',
        className
      )}
    >
      <div
        className={cn(
          'h-full transition-all duration-300',
          completed ? 'bg-primary' : 'bg-primary/80'
        )}
        style={{ width: `${Math.min(percentWatched, 100)}%` }}
      />
    </div>
  );
}

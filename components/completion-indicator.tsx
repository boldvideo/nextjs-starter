import { CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CompletionIndicatorProps {
  completed: boolean;
  className?: string;
}

/**
 * Checkmark indicator for completed videos
 * Replaces duration badge on thumbnails
 */
export function CompletionIndicator({
  completed,
  className,
}: CompletionIndicatorProps) {
  if (!completed) return null;

  return (
    <div
      className={cn(
        'absolute bottom-3 right-3 bg-primary text-primary-foreground rounded-full p-1',
        className
      )}
      aria-label="Video completed"
    >
      <CheckCircle className="w-4 h-4" />
    </div>
  );
}

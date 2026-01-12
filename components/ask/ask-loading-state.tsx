import { Loader2 } from "lucide-react";

export function AskLoadingState() {
  return (
    <div className="flex h-[calc(100vh-120px)] w-full items-center justify-center">
      <div className="flex items-center gap-3 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Loading conversation...</span>
      </div>
    </div>
  );
}

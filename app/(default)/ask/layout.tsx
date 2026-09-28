import { Suspense } from "react";
import { AskShell } from "@/components/ask/ask-shell";

// The thread lives in the layout, not the pages: layouts persist across
// child-route changes, so /ask and /ask/<id> share one mounted thread.
export default function AskLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={null}>
        <AskShell />
      </Suspense>
      {children}
    </>
  );
}

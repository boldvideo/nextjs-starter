import { Suspense } from "react";
import { AskResult } from "@/components/ask-result";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function AskPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const query = params.q as string;

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">
          {query ? "Ask AI" : "Ask a Question"}
        </h1>

        <div className="mb-8">
          <Suspense fallback={<div className="text-muted-foreground">Loading...</div>}>
            <AskResult query={query} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
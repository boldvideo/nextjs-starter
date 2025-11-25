import { SearchResults } from "@/components/search-results";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function SearchPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const hasQuery = !!(await searchParams).q;

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">
          {hasQuery ? "Search Results" : "Search"}
        </h1>

        <div className="mb-8">
          <SearchResults />
        </div>
      </div>
    </div>
  );
}

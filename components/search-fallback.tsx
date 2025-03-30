export function SearchResultsFallback() {
  return (
    <div className="py-16 flex items-center justify-center">
      <div className="animate-pulse space-y-6 w-full max-w-4xl">
        <div className="h-12 bg-muted rounded w-1/2"></div>
        <div className="h-8 bg-muted rounded w-1/3"></div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 bg-muted rounded"></div>
          ))}
        </div>
      </div>
    </div>
  );
}

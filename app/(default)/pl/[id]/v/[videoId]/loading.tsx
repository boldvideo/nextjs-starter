export default function Loading() {
  return (
    <div className="p-5 md:p-10 max-w-screen-2xl mx-auto">
      <div className="animate-pulse flex flex-col lg:flex-row gap-8">
        {/* Sidebar skeleton (desktop) */}
        <div className="hidden lg:block w-80 flex-shrink-0">
          <div className="h-screen bg-muted rounded" />
        </div>

        {/* Main content skeleton */}
        <div className="flex-1 space-y-4">
          <div className="h-8 bg-muted rounded w-1/4" />
          <div className="aspect-video bg-muted rounded" />
          <div className="h-6 bg-muted rounded w-3/4" />
          <div className="h-4 bg-muted rounded w-1/2" />
        </div>
      </div>
    </div>
  );
}

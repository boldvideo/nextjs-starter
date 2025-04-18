export default function Loading() {
  return (
    <div className="p-5 md:p-10 max-w-screen-2xl mx-auto">
      <div className="animate-pulse flex flex-col space-y-4">
        <div className="h-8 bg-muted rounded w-1/4" />
        <div className="h-96 bg-muted rounded" />
      </div>
    </div>
  );
}

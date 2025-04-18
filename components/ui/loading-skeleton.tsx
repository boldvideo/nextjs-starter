export function PageSkeleton({ children }: { children?: React.ReactNode }) {
  return (
    <div className="p-5 md:p-10 max-w-screen-2xl mx-auto animate-pulse space-y-4">
      {children}
    </div>
  );
}

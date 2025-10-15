import Link from "next/link";

export default function NotFound() {
  return (
    <div className="p-5 md:p-10 max-w-screen-2xl mx-auto">
      <div className="text-center py-12">
        <h1 className="text-4xl font-bold mb-4">Video Not Found</h1>
        <p className="text-muted-foreground mb-8">
          This video doesn&apos;t exist or is not available in this playlist.
        </p>
        <Link
          href="/"
          className="inline-block bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:opacity-90 transition-opacity"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}

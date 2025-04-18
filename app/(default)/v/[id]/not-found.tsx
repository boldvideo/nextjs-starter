import Link from "next/link";

export default function NotFound() {
  return (
    <div className="p-5 md:p-10 max-w-screen-2xl mx-auto">
      <h2 className="text-lg font-medium">Video not found</h2>
      <Link href="/" className="underline">
        Go back home
      </Link>
    </div>
  );
}

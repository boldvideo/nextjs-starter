import "@/app/(default)/globals.css";
import { notFound } from "next/navigation";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Playground | Bold",
  robots: "noindex, nofollow",
};

export default function PlaygroundLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-zinc-950 text-zinc-100 min-h-screen">
        <div className="flex flex-col min-h-screen">
          <header className="border-b border-zinc-800 px-6 py-4">
            <h1 className="text-xl font-semibold">AI Playground</h1>
            <p className="text-sm text-zinc-400">
              Internal testing tool for Bold AI features
            </p>
          </header>
          <main className="flex-1 p-6">{children}</main>
        </div>
      </body>
    </html>
  );
}

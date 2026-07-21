"use client";
import { usePathname } from "next/navigation";
import { SrlBar } from "@/components/srl-bar";

/**
 * Fixed chrome = exactly one startups.com-style nav bar. The panel
 * wrapper below it reads --site-bar-height (measured by SrlBar), so the
 * chrome never needs a second row.
 *
 * Watch pages on mobile scroll as one document (chrome included) — the
 * fixed header steps aside entirely there and the video layout renders
 * the bar in-flow instead. Hiding the fixed bar zeroes its measured
 * height, which collapses the panel's top offset automatically.
 */
export function Header({ className }: { className?: string }) {
  const pathname = usePathname();

  const isWatch =
    /^\/(v|e)\//.test(pathname ?? "") ||
    /^\/pl\/[^/]+\/v\//.test(pathname ?? "");

  return (
    <>
      {isWatch && (
        <style>{`@media (max-width: 1023.98px) { :root { --header-height: 0px; } }`}</style>
      )}
      <header
        className={`fixed top-0 z-40 w-full ${
          isWatch ? "hidden lg:block" : "block"
        } ${className || ""}`}
      >
        <SrlBar />
      </header>
    </>
  );
}

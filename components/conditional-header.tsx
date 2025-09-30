"use client";
import { usePathname } from "next/navigation";
import { Header } from "./header";
import type { Session } from "next-auth";

interface ConditionalHeaderProps {
  logo: any;
  logoDark?: string;
  menuItems: Array<{ url: string; label: string }>;
  session?: Session | null;
}

export function ConditionalHeader({
  logo,
  logoDark,
  menuItems,
  session,
}: ConditionalHeaderProps) {
  const pathname = usePathname();

  // Hide header on homepage
  if (pathname === "/") {
    return null;
  }

  return (
    <Header
      logo={logo}
      logoDark={logoDark}
      menuItems={menuItems}
      session={session}
    />
  );
}
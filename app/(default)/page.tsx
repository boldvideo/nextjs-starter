import React from "react";
import { bold } from "@/client";
import Image from "next/image";
import type { Settings } from "@boldvideo/bold-js";

// How often this page should revalidate (in seconds)
export const revalidate = 60;

interface ExtendedSettings extends Settings {
  logo_url?: string;
}

/**
 * Home page component - intentionally blank
 * @returns The rendered homepage
 */
export default async function Home(): Promise<React.JSX.Element> {
  const { data: settings } = await bold.settings();
  const extendedSettings = settings as ExtendedSettings;
  const logoUrl = extendedSettings?.logo_url || "/bold-logo.svg";

  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-8">
      <div className="relative w-48 h-16">
        <Image
          src={logoUrl}
          alt="Logo"
          fill
          className="object-contain"
          priority
        />
      </div>
      <p className="text-muted-foreground italic text-sm">
        This page has been intentionally left blank.
      </p>
    </div>
  );
}

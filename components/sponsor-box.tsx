"use client";

import Image from "next/image";
import Link from "next/link";
import { useTheme } from "next-themes";

interface SponsorBoxProps {
  sponsor: "webflow" | "lemonsqueezy";
}

export function SponsorBox({ sponsor }: SponsorBoxProps) {
  const { theme } = useTheme();
  
  const sponsors = {
    webflow: {
      lightLogo: "/sponsors/webflow-logo-blue-black.svg",
      darkLogo: "/sponsors/webflow-logo-blue-white.svg",
      url: "https://webflow.com"
    },
    lemonsqueezy: {
      lightLogo: "/sponsors/lemonsqueezy-logo-black-text.svg",
      darkLogo: "/sponsors/lemonsqueezy-logo-white-text.svg",
      url: "https://lemonsqueezy.com"
    }
  };

  const sponsorConfig = sponsors[sponsor];
  const logo = theme === "dark" ? sponsorConfig.darkLogo : sponsorConfig.lightLogo;

  return (
    <div className="flex items-center gap-3 text-lg text-muted-foreground">
      <span>Supported by</span>
      <Link 
        href={sponsorConfig.url} 
        target="_blank" 
        rel="noopener noreferrer"
        className="hover:opacity-80 transition-opacity"
      >
        <Image
          src={logo}
          alt={`${sponsor} logo`}
          width={sponsor === "webflow" ? 120 : 140}
          height={40}
          className="h-auto"
        />
      </Link>
    </div>
  );
}
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import "./globals.css";

import logo from "../../public/yourlogohere.png";
import { bold } from "@/client";
import { MobileMenu } from "@/components/mobile-menu";

export const metadata: Metadata = {
  title: "Bold Video x Next.js Starter Kit",
  description:
    "Bold Video Starter Kit: Supercharge videos, rapid encoding/transcription.",
  openGraph: {
    title: "Bold Video x Next.js Starter Kit",
    description:
      "Bold Video Starter Kit: Supercharge videos, rapid encoding/transcription.",
    url: "https://starter-demo.wearebold.af",
    siteName: "Bold Video x Next.js Starter Kit",
    images: [
      {
        url: "https://starter-demo.wearebold.af/og-static.png",
        width: 1200,
        height: 630,
      },
    ],
    locale: "en-US",
    type: "website",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: settings } = await bold.settings();
  console.log("settings", settings);
  return (
    <html lang="en">
      <body className="bg-white text-black">
        <header className="border-gray-200 border-b px-5 md:px-10 py-4 md:py-5">
          <nav className="flex items-center md:justify-between ">
            <h1 className="flex-1">
              <Link href="/">
                <Image
                  src={logo}
                  alt="acmenet Mediahub"
                  className="h-12 md:h-16 object-contain object-left"
                />
              </Link>
            </h1>
            <div className="hidden md:flex font-semibold text-lg px-3 gap-6">
              {settings.menu_items.map((item) => (
                <Link
                  className="hover:text-primary"
                  key={item.label}
                  href={item.url}
                >
                  {item.label}
                </Link>
              ))}
            </div>
            <div className="md:flex-1 flex justify-end">&nbsp;</div>

            <div className="flex md:hidden">
              <MobileMenu menuItems={settings.menu_items} />
            </div>
          </nav>
        </header>
        <main className="">{children}</main>
      </body>
    </html>
  );
}

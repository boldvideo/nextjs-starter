import type { Metadata } from "next";
import "./globals.css";

import logo from "../../public/bold-logo.svg";
import { bold } from "@/client";
import type { Settings } from "@boldvideo/bold-js";
import { ThemeProvider } from "@/components/theme-provider";
import { Header } from "@/components/header";

export const metadata: Metadata = {
  title: "Bold Video x Next.js Starter Kit",
  description:
    "Bold Video Starter Kit: Supercharge videos, rapid encoding/transcription.",
  openGraph: {
    title: "Bold Video x Next.js Starter Kit",
    description:
      "Bold Video Starter Kit: Supercharge videos, rapid encoding/transcription.",
    url: "https://starter-demo.bold.video",
    siteName: "Bold Video x Next.js Starter Kit",
    images: [
      {
        url: "https://starter-demo.bold.video/og-static.png",
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
  let settings = { menu_items: [] } as Partial<Settings> as Settings;

  try {
    const settingsResponse = await bold.settings();
    settings = settingsResponse.data;
  } catch (error) {
    console.error("Failed to fetch settings:", error);
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-background">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <Header logo={logo} menuItems={settings.menu_items || []} />
          <main>{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}

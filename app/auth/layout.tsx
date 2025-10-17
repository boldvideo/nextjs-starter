import type { Metadata } from "next";
import "../(default)/globals.css";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to access the video portal",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
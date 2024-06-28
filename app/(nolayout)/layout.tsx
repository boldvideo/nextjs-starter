export const metadata = {
  title: "Bold Demo Site",
  description: "Generated by bold.video",
};
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-black text-black">{children}</body>
    </html>
  );
}
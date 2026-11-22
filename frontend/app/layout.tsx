import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ethiopian Tourist Destination Assistant | AI Tourism Guide",
  description: "Explore Ethiopia's historic UNESCO heritage sites, national parks, scenic wonders, cultural experiences, and hotels with your AI travel companion.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#faf7f2] text-[#1e2420]">
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://gigdock.co"),
  title: {
    default: "GigDock — Casting Calls & Gigs",
    template: "%s · GigDock",
  },
  description:
    "Find casting calls and gig work matched to you. GigDock surfaces opportunities across every region so you never miss the right one.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="min-h-full flex flex-col font-sans antialiased">
        {children}
      </body>
    </html>
  );
}

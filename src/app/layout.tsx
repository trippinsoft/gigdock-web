import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.gigdock.co"),
  title: {
    default: "GigDock — Film & TV Opportunities",
    template: "%s · GigDock",
  },
  description:
    "Find film & TV casting opportunities from across the web, search them in one place, and use GigFit to see which ones match you.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const orgLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "GigDock",
    url: "https://www.gigdock.co",
    logo: "https://www.gigdock.co/gigdock-logo.png",
    description:
      "GigDock brings film & TV casting calls and gig work from across the web into one searchable feed, matched to you with GigFit.",
  };
  const siteLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "GigDock",
    url: "https://www.gigdock.co",
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: "https://www.gigdock.co/opportunities?q={search_term_string}" },
      "query-input": "required name=search_term_string",
    },
  };
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="min-h-full flex flex-col font-sans antialiased">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(siteLd) }} />
        {children}
      </body>
    </html>
  );
}

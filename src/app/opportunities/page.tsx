import type { Metadata } from "next";
import OpportunitiesFeed from "@/components/OpportunitiesFeed";

export const metadata: Metadata = {
  title: "Browse Film & TV Casting Calls & Opportunities",
  description:
    "Search current film & TV casting calls and background acting opportunities from across the web in one feed, matched to you with GigFit.",
  alternates: { canonical: "/opportunities" },
  openGraph: {
    title: "Film & TV Casting Calls & Opportunities · GigDock",
    description:
      "Current film & TV casting calls from many sources in one searchable feed, matched to you with GigFit.",
    type: "website",
    siteName: "GigDock",
  },
};

export default function OpportunitiesPage() {
  return <OpportunitiesFeed />;
}

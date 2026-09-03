"use client";

import Link from "next/link";
import { track } from "@/lib/analytics";

// Small client wrapper for the free-preview "Explore Pro" CTA on report/tax
// pages so we can fire the mobile-mirrored click event on the outbound tap.
export default function ExplorePro({
  href,
  event,
  props,
  children,
  className = "mt-4 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold",
}: {
  href: string;
  event: string;
  props?: Record<string, unknown>;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      onClick={() => track(event, props ?? {})}
      className={className}
    >
      {children}
    </Link>
  );
}

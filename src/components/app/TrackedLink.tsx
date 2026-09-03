"use client";

import Link from "next/link";
import { track } from "@/lib/analytics";

// Client Link wrapper that fires a fire-and-forget analytics event on click,
// then navigates normally. Use in server components where a navigation needs
// analytics without turning the whole page into a client component.
export default function TrackedLink({
  href,
  event,
  props,
  className,
  ariaLabel,
  children,
}: {
  href: string;
  event: string;
  props?: Record<string, unknown>;
  className?: string;
  ariaLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={() => track(event, props ?? {})}
      className={className}
      aria-label={ariaLabel}
    >
      {children}
    </Link>
  );
}

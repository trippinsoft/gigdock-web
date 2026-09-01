"use client";

import { useEffect, useState } from "react";

// Time-based greeting computed on the client so it reflects the viewer's local
// time (the server may be in a different timezone). Pre-mount it shows a neutral
// "Welcome back"; on mount it resolves to Good morning/afternoon/evening.
function timeGreeting(): string {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export default function TodayGreeting({ name }: { name: string | null }) {
  const [greeting, setGreeting] = useState<string | null>(null);
  useEffect(() => setGreeting(timeGreeting()), []);
  const base = greeting ?? "Welcome back";
  return (
    <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
      {name ? `${base}, ${name}` : base}
    </h1>
  );
}

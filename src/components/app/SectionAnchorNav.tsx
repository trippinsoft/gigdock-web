"use client";

// Sticky sub-navigation for the unified gig workspace. Clicking a label scrolls
// (smoothly) to that section; a scroll-spy keeps the active label in sync. It
// works whether the scroll happens in the desktop detail column (found via
// [data-scroll-container]) or in the window (mobile).

import { useEffect, useRef, useState } from "react";

export default function SectionAnchorNav({
  sections,
}: {
  sections: { id: string; label: string }[];
}) {
  const [active, setActive] = useState(sections[0]?.id);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = navRef.current?.closest("[data-scroll-container]") as HTMLElement | null;
    const isLg = typeof window !== "undefined" && window.matchMedia("(min-width:1024px)").matches;
    const root = isLg ? container : null;
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { root, rootMargin: "-15% 0px -75% 0px", threshold: 0 }
    );
    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, [sections]);

  const go = (id: string) => {
    setActive(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div
      ref={navRef}
      className="sticky top-14 lg:top-0 z-20 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/90 dark:bg-zinc-950/90 backdrop-blur"
    >
      <div className="flex gap-1 overflow-x-auto">
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => go(s.id)}
            className={`shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
              active === s.id
                ? "border-blue-600 text-blue-700 dark:text-blue-300"
                : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-100"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}

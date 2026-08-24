"use client";

// Desktop master → detail workspace. On large screens: a fixed-width scrollable
// master column beside a flexible detail column (both scroll independently,
// filling the viewport). On small screens it collapses to list → detail
// navigation: the master shows at the base path, the detail shows once an item
// is selected (URL is /<base>/<id>).

import { usePathname } from "next/navigation";

export default function MasterDetailLayout({
  master,
  children,
  basePath,
}: {
  master: React.ReactNode;
  children: React.ReactNode;
  basePath: string;
}) {
  const pathname = usePathname();
  const hasSelection = pathname !== basePath && pathname.startsWith(basePath);

  return (
    <div className="lg:h-[calc(100vh-3rem)] lg:flex lg:rounded-2xl lg:border lg:border-zinc-200 lg:dark:border-zinc-800 lg:overflow-hidden">
      {/* Master */}
      <div
        className={`bg-white dark:bg-zinc-900 lg:w-[23rem] lg:shrink-0 lg:border-r lg:border-zinc-200 lg:dark:border-zinc-800 lg:h-full lg:overflow-y-auto ${
          hasSelection ? "hidden lg:block" : "block"
        }`}
      >
        {master}
      </div>
      {/* Detail */}
      <div
        data-scroll-container
        className={`bg-zinc-50 dark:bg-zinc-950 lg:flex-1 lg:min-w-0 lg:h-full lg:overflow-y-auto ${
          hasSelection ? "block" : "hidden lg:block"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

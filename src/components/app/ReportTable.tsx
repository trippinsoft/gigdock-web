"use client";

// Sortable table for Advanced Reports. Cells arrive from buildReport()
// pre-formatted as strings ($1,234.56 · 9/5/2026 · "Not recorded") or as
// numbers, so sort parses each cell into a comparable value and falls back to
// a case-insensitive string compare.
//
// Table state can be controlled (parent supplies sortCol/dir/onHeaderClick) or
// uncontrolled (managed here). Controlled mode is what ReportBody uses so the
// export button and the table stay in lockstep.

import { useMemo, useState } from "react";

type Cell = string | number;

function parseCell(cell: Cell): number | string {
  if (typeof cell === "number") return cell;
  const s = cell.trim();
  if (!s || s === "—" || s === "Not recorded") return Number.NEGATIVE_INFINITY;
  const money = s.match(/^(-?)\$([\d,]+(?:\.\d+)?)$/);
  if (money) return parseFloat(money[2].replace(/,/g, "")) * (money[1] === "-" ? -1 : 1);
  const range = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s*[–-]\s*\d{1,2}\/\d{1,2}\/\d{4}$/);
  if (range) return new Date(Number(range[3]), Number(range[1]) - 1, Number(range[2])).getTime();
  const date = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (date) return new Date(Number(date[3]), Number(date[1]) - 1, Number(date[2])).getTime();
  if (/^-?[\d,]+(?:\.\d+)?$/.test(s)) return parseFloat(s.replace(/,/g, ""));
  return s.toLowerCase();
}

function compareCells(a: Cell, b: Cell): number {
  const va = parseCell(a);
  const vb = parseCell(b);
  if (typeof va === "number" && typeof vb === "number") return va - vb;
  if (typeof va === "number") return 1;
  if (typeof vb === "number") return -1;
  return va.localeCompare(vb);
}

export type Dir = "asc" | "desc";

/** Sort a copy of rows by column with a stable fallback on original index. */
export function sortRows(rows: Cell[][], sortCol: number | null, dir: Dir): Cell[][] {
  if (sortCol == null) return rows;
  const indexed = rows.map((r, i) => ({ r, i }));
  indexed.sort((a, b) => {
    const c = compareCells(a.r[sortCol], b.r[sortCol]);
    return (dir === "asc" ? c : -c) || a.i - b.i;
  });
  return indexed.map((x) => x.r);
}

/** Default direction when a header is first clicked. */
export function defaultDirFor(col: number): Dir {
  // Label column reads A–Z first; numeric/right-aligned columns read largest-first.
  return col === 0 ? "asc" : "desc";
}

type ControlledProps = {
  sortCol: number | null;
  dir: Dir;
  onHeaderClick: (col: number) => void;
};

export default function ReportTable({
  columns,
  rows,
  sortable = true,
  controlled,
}: {
  columns: string[];
  rows: Cell[][];
  sortable?: boolean;
  controlled?: ControlledProps;
}) {
  const [uSortCol, setUSortCol] = useState<number | null>(null);
  const [uDir, setUDir] = useState<Dir>("asc");

  const sortCol = controlled ? controlled.sortCol : uSortCol;
  const dir = controlled ? controlled.dir : uDir;

  const displayRows = useMemo(() => {
    if (!sortable) return rows;
    // Parent controls sort, so it also owns the sorted list (avoids double work).
    return controlled ? rows : sortRows(rows, sortCol, dir);
  }, [rows, sortCol, dir, sortable, controlled]);

  const handleHeaderClick = (i: number) => {
    if (!sortable) return;
    if (controlled) {
      controlled.onHeaderClick(i);
      return;
    }
    if (uSortCol !== i) {
      setUSortCol(i);
      setUDir(defaultDirFor(i));
      return;
    }
    setUDir(uDir === "asc" ? "desc" : "asc");
  };

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 dark:border-zinc-800">
              {columns.map((c, i) => {
                const active = sortCol === i;
                const align = i === 0 ? "text-left" : "text-right";
                const interactive = sortable
                  ? "cursor-pointer select-none hover:text-zinc-700 dark:hover:text-zinc-300"
                  : "";
                return (
                  <th
                    key={c}
                    scope="col"
                    aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
                    onClick={() => handleHeaderClick(i)}
                    className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500 ${align} ${interactive}`}
                  >
                    <span className="inline-flex items-center gap-1">
                      {i === 0 ? (
                        <>
                          {c}
                          {sortable && <SortArrow active={active} dir={dir} />}
                        </>
                      ) : (
                        <>
                          {sortable && <SortArrow active={active} dir={dir} />}
                          {c}
                        </>
                      )}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {displayRows.map((r, ri) => (
              <tr key={ri}>
                {r.map((c, ci) => (
                  <td
                    key={ci}
                    className={`px-4 py-2.5 ${
                      ci === 0
                        ? "text-left font-medium text-zinc-800 dark:text-zinc-200"
                        : "text-right text-zinc-600 dark:text-zinc-300"
                    }`}
                  >
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SortArrow({ active, dir }: { active: boolean; dir: Dir }) {
  if (!active) {
    return (
      <svg
        width="10"
        height="10"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-zinc-300 dark:text-zinc-600"
        aria-hidden
      >
        <path d="m7 15 5 5 5-5" />
        <path d="m7 9 5-5 5 5" />
      </svg>
    );
  }
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-blue-600 dark:text-blue-400"
      aria-hidden
    >
      {dir === "asc" ? <path d="m7 15 5-5 5 5" /> : <path d="m7 9 5 5 5-5" />}
    </svg>
  );
}

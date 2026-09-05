"use client";

// Pro report body: owns the sort state so the table and the CSV/PDF export
// stay in lockstep. Whatever order the user is looking at is the order that
// lands in the exported file.

import { useMemo, useState } from "react";
import ReportTable, { sortRows, defaultDirFor, type Dir } from "@/components/app/ReportTable";
import ReportExport, { type ReportData } from "@/components/app/ReportExport";

export default function ReportBody({
  columns,
  rows,
  note,
  reportData,
  reportId,
}: {
  columns: string[];
  rows: (string | number)[][];
  note?: string;
  reportData: ReportData;
  reportId?: string;
}) {
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [dir, setDir] = useState<Dir>("asc");

  const sortedRows = useMemo(() => sortRows(rows, sortCol, dir), [rows, sortCol, dir]);

  const handleHeaderClick = (i: number) => {
    if (sortCol !== i) {
      setSortCol(i);
      setDir(defaultDirFor(i));
      return;
    }
    setDir(dir === "asc" ? "desc" : "asc");
  };

  const exportData: ReportData = useMemo(
    () => ({
      ...reportData,
      tables: reportData.tables.map((t, i) =>
        // Only the first table carries the sortable rows; secondary tables
        // (rare) pass through untouched.
        i === 0 ? { ...t, rows: sortedRows } : t
      ),
    }),
    [reportData, sortedRows]
  );

  return (
    <>
      <ReportTable
        columns={columns}
        rows={sortedRows}
        controlled={{ sortCol, dir, onHeaderClick: handleHeaderClick }}
      />
      {note && <p className="mt-3 text-xs text-zinc-400 dark:text-zinc-500">{note}</p>}
      <div className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3">
        <div className="text-sm text-zinc-600 dark:text-zinc-400">Export this report</div>
        <ReportExport data={exportData} reportId={reportId} />
      </div>
    </>
  );
}

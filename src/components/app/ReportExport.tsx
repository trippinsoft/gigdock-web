"use client";

// Report export — CSV and PDF, both client-side and dependency-free.
//   • CSV  → a Blob download of the report's summary + tables.
//   • PDF  → opens a clean, standalone printable document in a new window and
//            invokes the browser's print dialog ("Save as PDF"). This avoids
//            fighting the app chrome with print CSS and produces a real report
//            document rather than a screenshot of the page.
// Rendered only for Pro users; free users get a ProLock in its place.

import { useState } from "react";
import { track } from "@/lib/analytics";

export type ReportTable = {
  heading?: string;
  columns: string[];
  rows: (string | number)[][];
};

export type ReportData = {
  title: string;
  periodLabel: string;
  summary: { label: string; value: string }[];
  tables: ReportTable[];
  /** Footnote shown under the report (e.g. the "never estimated" disclaimer). */
  note?: string;
};

function csvCell(v: string | number): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(data: ReportData): string {
  const lines: string[] = [];
  lines.push(csvCell(data.title));
  lines.push(csvCell(data.periodLabel));
  lines.push("");
  if (data.summary.length) {
    lines.push("Metric,Value");
    for (const s of data.summary) lines.push(`${csvCell(s.label)},${csvCell(s.value)}`);
    lines.push("");
  }
  for (const t of data.tables) {
    if (t.heading) lines.push(csvCell(t.heading));
    lines.push(t.columns.map(csvCell).join(","));
    for (const r of t.rows) lines.push(r.map(csvCell).join(","));
    lines.push("");
  }
  if (data.note) lines.push(csvCell(data.note));
  return lines.join("\n");
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function esc(v: string | number): string {
  return String(v ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] as string));
}

function printHtml(data: ReportData): string {
  const summary = data.summary
    .map((s) => `<div class="stat"><div class="stat-label">${esc(s.label)}</div><div class="stat-value">${esc(s.value)}</div></div>`)
    .join("");
  const tables = data.tables
    .map((t) => {
      const head = t.columns.map((c, i) => `<th class="${i === 0 ? "" : "num"}">${esc(c)}</th>`).join("");
      const body = t.rows
        .map((r) => `<tr>${r.map((c, i) => `<td class="${i === 0 ? "" : "num"}">${esc(c)}</td>`).join("")}</tr>`)
        .join("");
      return `${t.heading ? `<h2>${esc(t.heading)}</h2>` : ""}<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
    })
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(data.title)}</title>
<style>
  * { box-sizing: border-box; }
  body { font: 13px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #18181b; margin: 32px; }
  .brand { font-weight: 800; font-size: 15px; color: #2563eb; letter-spacing: -0.01em; }
  h1 { font-size: 22px; margin: 4px 0 2px; }
  .period { color: #71717a; margin-bottom: 20px; }
  .stats { display: flex; flex-wrap: wrap; gap: 24px; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #e4e4e7; }
  .stat-label { font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: #a1a1aa; }
  .stat-value { font-size: 20px; font-weight: 700; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .04em; color: #71717a; margin: 22px 0 8px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; padding: 7px 8px; border-bottom: 1px solid #ececef; }
  th { font-size: 11px; text-transform: uppercase; letter-spacing: .03em; color: #a1a1aa; }
  .num { text-align: right; }
  .note { margin-top: 20px; color: #a1a1aa; font-size: 11px; }
  @media print { body { margin: 0.6in; } }
</style></head><body>
  <div class="brand">GigDock</div>
  <h1>${esc(data.title)}</h1>
  <div class="period">${esc(data.periodLabel)}</div>
  ${summary ? `<div class="stats">${summary}</div>` : ""}
  ${tables}
  ${data.note ? `<div class="note">${esc(data.note)}</div>` : ""}
</body></html>`;
}

export default function ReportExport({ data, reportId }: { data: ReportData; reportId?: string }) {
  const [busy, setBusy] = useState(false);
  const analyticsProps = { report: reportId ?? slug(data.title), period: data.periodLabel };

  function exportCsv() {
    const blob = new Blob([toCsv(data)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gigdock-${slug(data.title)}-${slug(data.periodLabel)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    // Mirror mobile: fire the format-specific export event and the shared event.
    track("report_export_csv", analyticsProps);
    track("report_shared", { ...analyticsProps, format: "csv" });
    if (reportId === "taxReady") track("tax_ready_report_exported", { format: "csv" });
  }

  function exportPdf() {
    setBusy(true);
    const w = window.open("", "_blank");
    if (!w) {
      setBusy(false);
      alert("Please allow pop-ups to export a PDF.");
      return;
    }
    w.document.write(printHtml(data));
    w.document.close();
    w.focus();
    // Give the new document a tick to lay out before invoking print.
    setTimeout(() => {
      w.print();
      setBusy(false);
    }, 250);
    track("report_export_pdf", analyticsProps);
    track("report_shared", { ...analyticsProps, format: "pdf" });
    if (reportId === "taxReady") track("tax_ready_report_exported", { format: "pdf" });
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={exportPdf}
        disabled={busy}
        className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white transition-colors"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9V2h12v7" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" rx="1" /></svg>
        Export PDF
      </button>
      <button
        onClick={exportCsv}
        className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-medium border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></svg>
        Export CSV
      </button>
    </div>
  );
}

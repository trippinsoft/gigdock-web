"use client";

import { useState } from "react";
import type { Opportunity } from "@/lib/types";

function Badge({
  children,
  color,
}: {
  children: React.ReactNode;
  color: "green" | "blue" | "amber" | "red" | "zinc";
}) {
  const classes: Record<string, string> = {
    green:
      "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
    blue: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
    amber:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    red: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
    zinc: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${classes[color]}`}
    >
      {children}
    </span>
  );
}

function statusColor(status: string): "green" | "blue" | "amber" | "red" | "zinc" {
  switch (status) {
    case "active":
      return "green";
    case "draft":
      return "blue";
    case "expired":
      return "amber";
    case "hidden":
      return "red";
    default:
      return "zinc";
  }
}

export default function OpportunityCard({
  opp,
  actions,
  showRawText,
}: {
  opp: Opportunity;
  actions?: React.ReactNode;
  showRawText?: string | null;
}) {
  const specs = opp.casting_specs;
  const [lightboxOpen, setLightboxOpen] = useState(false);

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {opp.image_url && (
            <button
              type="button"
              onClick={() => setLightboxOpen(true)}
              className="shrink-0 w-14 h-14 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={opp.image_url}
                alt=""
                className="w-full h-full object-cover"
              />
            </button>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                {opp.title || "(No title)"}
              </h3>
              <Badge color={statusColor(opp.status)}>{opp.status}</Badge>
              {opp.source_type && (
                <Badge color="zinc">{opp.source_type}</Badge>
              )}
            </div>
            {opp.source && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Source: {opp.source}
              </p>
            )}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>

      {opp.summary && (
        <p className="text-sm text-zinc-700 dark:text-zinc-300">{opp.summary}</p>
      )}

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-600 dark:text-zinc-400">
        {opp.location && <span>📍 {opp.location}</span>}
        {opp.work_date && <span>📅 {opp.work_date}</span>}
        {opp.pay_rate && <span>💰 {opp.pay_rate}</span>}
        {opp.apply_by && <span>⏰ Apply by: {opp.apply_by}</span>}
      </div>

      {opp.pay_bumps && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          <span className="font-medium">Bumps:</span> {opp.pay_bumps}
        </p>
      )}

      {opp.requirements && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          <span className="font-medium">Requirements:</span> {opp.requirements}
        </p>
      )}

      {specs && Object.keys(specs).length > 0 && (
        <div className="flex flex-wrap gap-1">
          {specs.gender && <Badge color="zinc">Gender: {specs.gender}</Badge>}
          {specs.age_min != null && specs.age_max != null && (
            <Badge color="zinc">
              Age: {specs.age_min}-{specs.age_max}
            </Badge>
          )}
          {specs.ethnicity && (
            <Badge color="zinc">Ethnicity: {specs.ethnicity}</Badge>
          )}
          {specs.vehicle && <Badge color="zinc">Vehicle: {specs.vehicle}</Badge>}
          {specs.union_status && (
            <Badge color="zinc">Union: {specs.union_status}</Badge>
          )}
          {specs.skills && <Badge color="zinc">Skills: {specs.skills}</Badge>}
        </div>
      )}

      {opp.application_info && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          <span className="font-medium">How to apply:</span>{" "}
          {opp.application_info}
        </p>
      )}

      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {opp.link && (
          <a
            href={opp.link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Apply here →
          </a>
        )}
        {opp.source_url && (
          <a
            href={opp.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            View original post →
          </a>
        )}
      </div>

      {showRawText && (
        <details className="mt-2">
          <summary className="text-xs text-zinc-400 cursor-pointer hover:text-zinc-600 dark:hover:text-zinc-300">
            Show raw text
          </summary>
          <pre className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800 p-3 rounded overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto">
            {showRawText}
          </pre>
        </details>
      )}

      {lightboxOpen && opp.image_url && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setLightboxOpen(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={opp.image_url}
            alt=""
            className="max-w-full max-h-full rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 text-white text-3xl leading-none"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}

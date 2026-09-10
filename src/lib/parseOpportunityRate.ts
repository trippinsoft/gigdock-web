// Ported verbatim from the mobile app's utils/parseOpportunityRate.js so the
// web supplies the same p_pay_type / p_pay_*_amount / p_pay_*_hours args to
// the shared `add_opportunity_to_my_gigs` RPC. Keep in lockstep with the
// mobile file — the RPC treats these as authoritative for the created Gig's
// pay structure.

export type ParsedRate = {
  original: string;
  confidence: "none" | "low" | "medium" | "high";
  payType?: "guaranteedMin" | "hourly" | "dayRate" | "flatRate";
  payMinimumAmount?: number | null;
  payMinimumHours?: number | null;
  payHourlyRate?: number | null;
  payFlatRate?: number | null;
};

const moneyValue = (value: unknown): number | null => {
  const parsed = Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
};

const firstAmount = (value: string): string | undefined =>
  String(value ?? "").match(/\$\s*([0-9][0-9,]*(?:\.\d{1,2})?)/)?.[1];

const amountForDayRate = (value: string): number | null => {
  const amountBeforeDay = String(value ?? "").match(
    /\$\s*([0-9][0-9,]*(?:\.\d{1,2})?)\s*\+?\s*(?:[A-Z]{3}\s*)?(?:\/\s*(?:day|dy)\b|(?:per|a|each)\s+(?:(?:shoot|work)\s+)?day\b)/i
  )?.[1];
  const amountAfterDay = String(value ?? "").match(
    /\b(?:day|daily)\s+rate\b\s*(?:is|of|:|-)?\s*\$\s*([0-9][0-9,]*(?:\.\d{1,2})?)/i
  )?.[1];
  return moneyValue(amountBeforeDay || amountAfterDay);
};

export function parseOpportunityRate(value: string | null | undefined): ParsedRate {
  const original = String(value ?? "").trim();
  if (!original) return { original, confidence: "none" };

  const normalized = original.replace(/[–—]/g, "-");
  const hasRange = /\$\s*[\d,.]+\s*-\s*\$?\s*[\d,.]+/.test(normalized);
  const hasAlternatives = /;|\b(?:or|supporting roles?|photo doubles?|featured|special[- ]skill)\b/i.test(
    normalized
  );
  const amount = moneyValue(firstAmount(normalized));

  if (
    amount == null ||
    /\b(?:gift card|scale|rate shared|competitive|paid opportunity|paid background|paid modeling|paid speaking)\b/i.test(
      normalized
    )
  ) {
    return { original, confidence: "none" };
  }

  const hasDayRate =
    /\/\s*(?:day|dy)\b|\b(?:per|a|each)\s+(?:(?:shoot|work)\s+)?day\b|\b(?:day|daily)\s+rate\b/i.test(
      normalized
    );
  if (hasDayRate) {
    const dailyAmount = hasRange ? amount : amountForDayRate(normalized);
    return {
      original,
      confidence: hasRange ? "medium" : "high",
      payType: "dayRate",
      payFlatRate: dailyAmount ?? amount,
    };
  }

  const guarantee = normalized.match(
    /\$\s*([\d,]+(?:\.\d{1,2})?)\s*(?:\/|for\s+(?:up\s+to\s+)?)\s*(\d+(?:\.\d+)?)\s*(?:h(?:ou)?rs?)?\b/i
  );
  if (guarantee && !hasAlternatives) {
    const minimumAmount = moneyValue(guarantee[1]);
    const minimumHours = Number(guarantee[2]);
    return {
      original,
      confidence: "high",
      payType: "guaranteedMin",
      payMinimumAmount: minimumAmount,
      payMinimumHours: minimumHours,
      payHourlyRate: minimumHours ? (minimumAmount ?? 0) / minimumHours : null,
    };
  }

  if (
    /\b(?:guarantee(?:d)?|guaranteed?\s+(?:rate|pay)|minimum\s+(?:rate|pay))\b/i.test(normalized) &&
    !hasAlternatives
  ) {
    return {
      original,
      confidence: "high",
      payType: "guaranteedMin",
      payMinimumAmount: amount,
    };
  }

  if (/\/\s*(?:hr|hour)\b|per\s+hour|hourly/i.test(normalized)) {
    return {
      original,
      confidence: hasRange ? "medium" : "high",
      payType: "hourly",
      payHourlyRate: amount,
    };
  }

  if (/flat\s+rate|session\s+fee|shoot\s+fee/i.test(normalized)) {
    return {
      original,
      confidence: hasAlternatives ? "medium" : "high",
      payType: "flatRate",
      payFlatRate: amount,
    };
  }

  return { original, confidence: "low" };
}

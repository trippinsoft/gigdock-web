// Day-status pill. Uses the mobile app's calendar palette hex values verbatim
// so a "Booked" row on web reads with the same amber a "Booked" day shows on
// the phone. Colors come from themes/palettes.js and the calendar overrides
// in mobile's custom-files/GigVaultCalendar.js:
//
//   Booked / availability check → #fcd34d (light) · #c99b3b (dark)
//   Worked / paid              → #8dca4a (light) · #5e9f16 (dark)
//   Unavailable                → #d1d5db (light) · #475569 (dark)
//
// Uses Tailwind arbitrary color syntax so the exact mobile hex values ship,
// not the nearest default palette entry.

const STATUS_LABELS: Record<string, string> = {
  availability_checked: "Availability check",
  availability_check: "Availability check",
  availabilityChecked: "Availability check",
  booked: "Booked",
  worked: "Worked",
  paid: "Paid",
  unavailable: "Unavailable",
};

type Tone = "availability" | "booked" | "worked" | "unavailable" | "neutral";

function toneFor(code: string | null | undefined): Tone {
  if (!code) return "neutral";
  const c = code.toLowerCase();
  if (c.startsWith("availability")) return "availability";
  if (c === "booked") return "booked";
  if (c === "worked" || c === "paid") return "worked";
  if (c === "unavailable") return "unavailable";
  return "neutral";
}

const TONE_CLASSES: Record<Tone, string> = {
  // Amber outline — availability-check reads the same way on the calendar
  // chips: colored border, no fill.
  availability: "border border-[#fcd34d] text-[#a26200] dark:border-[#c99b3b] dark:text-[#f5c66a]",
  // Solid amber for booked — matches the mobile calendar fill.
  booked: "bg-[#fcd34d] text-zinc-900 dark:bg-[#c99b3b] dark:text-zinc-950",
  // Green that matches the mobile calendar's paid/worked marker.
  worked: "bg-[#8dca4a] text-zinc-900 dark:bg-[#5e9f16] dark:text-white",
  unavailable: "bg-[#d1d5db] text-zinc-700 dark:bg-[#475569] dark:text-slate-100",
  neutral: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
};

export function dayStatusLabel(code: string | null | undefined): string | null {
  if (!code) return null;
  return STATUS_LABELS[code] ?? code;
}

export default function DayStatusPill({
  status,
  size = "sm",
}: {
  status: string | null | undefined;
  size?: "sm" | "xs";
}) {
  const label = dayStatusLabel(status);
  if (!label) return null;
  const tone = toneFor(status);
  const sizeCls =
    size === "xs"
      ? "text-[10px] px-1.5 py-0.5"
      : "text-[11px] px-2 py-0.5";
  return (
    <span
      className={`inline-flex items-center rounded font-semibold uppercase tracking-wide ${sizeCls} ${TONE_CLASSES[tone]}`}
    >
      {label}
    </span>
  );
}

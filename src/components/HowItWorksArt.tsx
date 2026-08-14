// Decorative inline-SVG illustrations for the "How GigDock works" cards.
// Kept as vectors (not raster) so they stay crisp and match GigDock blue.

/* GigFit: a performer profile matched out to casting opportunities. */
export function GigFitArt() {
  const rows = [
    { y: 96, label: "Background Actor" },
    { y: 116, label: "Non-Union" },
    { y: 136, label: "Atlanta, GA" },
  ];
  const cards = [
    { y: 18, icon: "clap" as const },
    { y: 70, icon: "camera" as const },
    { y: 122, icon: "people" as const },
  ];
  return (
    <svg viewBox="0 0 360 180" className="w-full h-auto" role="img" aria-label="Your profile matched to casting opportunities">
      {/* connectors */}
      <g stroke="#93c5fd" strokeWidth="2" strokeDasharray="1 5" strokeLinecap="round" fill="none">
        <path d="M128 90 H148" />
        <path d="M186 90 H206" />
        <path d="M206 90 V38 H226" />
        <path d="M206 90 H226" />
        <path d="M206 90 V142 H226" />
      </g>

      {/* profile card */}
      <rect x="8" y="28" width="120" height="124" rx="12" fill="#ffffff" stroke="#dbeafe" strokeWidth="2" />
      <circle cx="40" cy="60" r="15" fill="#dbeafe" />
      <circle cx="40" cy="55" r="5.5" fill="#2563eb" />
      <path d="M29 72c0-7 22-7 22 0z" fill="#2563eb" />
      <rect x="62" y="52" width="52" height="6" rx="3" fill="#e2e8f0" />
      <rect x="62" y="64" width="40" height="6" rx="3" fill="#eef2f7" />
      {rows.map((r) => (
        <g key={r.label}>
          <circle cx="26" cy={r.y} r="7" fill="#2563eb" />
          <path d={`M22.4 ${r.y} l2.4 2.4 l4.4 -4.8`} fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <text x="38" y={r.y + 3.6} fontSize="10.5" fontWeight="500" fill="#334155">{r.label}</text>
        </g>
      ))}

      {/* star hub */}
      <g stroke="#2563eb" strokeWidth="2" strokeLinecap="round">
        <line x1="167" y1="63" x2="167" y2="56" /><line x1="153" y1="71" x2="148" y2="67" /><line x1="181" y1="71" x2="186" y2="67" />
      </g>
      <circle cx="167" cy="90" r="19" fill="#2563eb" />
      <path transform="translate(167,90) scale(1.35)" d="M0 -7 L2 -2.2 7 -2 3 1.4 4.3 6.4 0 3.4 -4.3 6.4 -3 1.4 -7 -2 -2 -2.2 Z" fill="#ffffff" />

      {/* result cards */}
      {cards.map((c, i) => (
        <g key={i} transform={`translate(226,${c.y})`}>
          <rect width="126" height="40" rx="8" fill="#ffffff" stroke="#dbeafe" strokeWidth="1.5" />
          <rect x="8" y="8" width="24" height="24" rx="5" fill="#eff6ff" />
          <g transform="translate(20,20)" stroke="#2563eb" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
            {c.icon === "clap" && (<>
              <rect x="-8" y="-1" width="16" height="8" rx="1.5" />
              <path d="M-8 -1 L-5 -5 L-2 -3.5 L-5 0 M-2 -4.5 L1 -7.5 L4 -6 L1 -2.5" />
            </>)}
            {c.icon === "camera" && (<>
              <rect x="-8" y="-5" width="11" height="10" rx="1.5" />
              <path d="M3 -2 L8 -5 L8 5 L3 2 Z" />
            </>)}
            {c.icon === "people" && (<>
              <circle cx="-3" cy="-3" r="2.6" /><circle cx="4" cy="-2" r="2.2" />
              <path d="M-9 7c0-4.5 12-4.5 12 0 M2 6.5c0-3 8-3 8 0.5" />
            </>)}
          </g>
          <rect x="74" y="7" width="44" height="14" rx="7" fill="#dbeafe" />
          <text x="96" y="17" textAnchor="middle" fontSize="7.5" fontWeight="700" fill="#1d4ed8">MATCH</text>
          <g transform="translate(46,30)">
            {[0, 1, 2, 3, 4].map((s) => (
              <path key={s} transform={`translate(${s * 13},0) scale(0.85)`} d="M0 -5 L1.5 -1.6 5 -1.4 2.2 1 3.1 4.6 0 2.4 -3.1 4.6 -2.2 1 -5 -1.4 -1.5 -1.6 Z" fill={s < 4 ? "#2563eb" : "#cbd5e1"} />
            ))}
          </g>
        </g>
      ))}
    </svg>
  );
}

/* Save, apply & share: a list of opportunities fanning out to the three actions. */
export function SaveShareArt() {
  const rows = [
    { y: 55, icon: "bookmark" as const },
    { y: 95, icon: "clipboard" as const },
    { y: 135, icon: "share" as const },
  ];
  return (
    <svg viewBox="0 0 360 180" className="w-full h-auto" role="img" aria-label="Save, apply and share your opportunities">
      {/* connectors */}
      <g stroke="#93c5fd" strokeWidth="2" strokeDasharray="1 5" strokeLinecap="round" fill="none">
        <path d="M164 55 H296" /><path d="M164 95 H296" /><path d="M164 135 H296" />
      </g>

      {/* list card */}
      <rect x="8" y="22" width="156" height="136" rx="12" fill="#ffffff" stroke="#e2e8f0" strokeWidth="2" />
      {rows.map((r, i) => (
        <g key={i}>
          <rect x="22" y={r.y - 13} width="26" height="26" rx="6" fill="#eff6ff" />
          <g transform={`translate(35,${r.y})`} stroke="#2563eb" strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round">
            {r.icon === "bookmark" && <path d="M-4 -6 h8 v13 l-4 -3 -4 3 z" fill="#2563eb" stroke="none" />}
            {r.icon === "clipboard" && (<>
              <rect x="-5" y="-6" width="10" height="13" rx="1.5" />
              <rect x="-2.5" y="-8.5" width="5" height="3.5" rx="1" fill="#2563eb" stroke="none" />
              <path d="M-2.4 0.4 l1.8 1.8 l3.2 -3.6" />
            </>)}
            {r.icon === "share" && (<>
              <circle cx="4" cy="-5" r="2" /><circle cx="-5" cy="0" r="2" /><circle cx="4" cy="5" r="2" />
              <path d="M-3.2 -1 L2.2 -4 M-3.2 1 L2.2 4" />
            </>)}
          </g>
          <rect x="60" y={r.y - 6} width="82" height="5" rx="2.5" fill="#e2e8f0" />
          <rect x="60" y={r.y + 3} width="58" height="5" rx="2.5" fill="#eef2f7" />
        </g>
      ))}

      {/* save → folder + bookmark */}
      <g transform="translate(318,55)">
        <circle r="22" fill="#dbeafe" />
        <g stroke="#1d4ed8" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M-12 -5 h6 l2 3 h12 a1 1 0 0 1 1 1 v8 a1 1 0 0 1 -1 1 h-20 a1 1 0 0 1 -1 -1 v-11 a1 1 0 0 1 1 -1 z" />
          <path d="M3 -1 h6 v8 l-3 -2 -3 2 z" fill="#1d4ed8" stroke="none" />
        </g>
        <g stroke="#2563eb" strokeWidth="1.6" strokeLinecap="round"><line x1="15" y1="-17" x2="17" y2="-21" /><line x1="19" y1="-13" x2="23" y2="-15" /><line x1="20" y1="-19" x2="22" y2="-22" /></g>
      </g>
      {/* apply → document + pencil */}
      <g transform="translate(318,95)">
        <circle r="22" fill="#dbeafe" />
        <g stroke="#1d4ed8" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M-8 -11 h10 l6 6 v15 a1 1 0 0 1 -1 1 h-15 a1 1 0 0 1 -1 -1 v-20 a1 1 0 0 1 1 -1 z" />
          <path d="M2 -11 v6 h6" />
          <path d="M9 -1 l3 3 -8 8 -4 1 1 -4 z" fill="#eff6ff" />
        </g>
      </g>
      {/* share → chat + people */}
      <g transform="translate(318,135)">
        <circle r="22" fill="#dbeafe" />
        <path d="M-12 -8 h15 a2 2 0 0 1 2 2 v7 a2 2 0 0 1 -2 2 h-9 l-4 4 v-4 h-2 a2 2 0 0 1 -2 -2 v-7 a2 2 0 0 1 2 -2 z" fill="#1d4ed8" />
        <circle cx="-3" cy="7" r="4" fill="#93c5fd" /><circle cx="6" cy="8" r="3.4" fill="#2563eb" />
      </g>
    </svg>
  );
}

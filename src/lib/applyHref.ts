import type { Opportunity } from "@/lib/types";

// Turn a single stored value into a valid href. Bare domains get https://,
// bare emails get mailto:, anything already schemed is left alone.
function normalizeHref(raw: string | null | undefined): string | null {
  const v = (raw ?? "").trim();
  if (!v) return null;
  if (/^(https?:|mailto:|tel:)/i.test(v)) return v;
  if (/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v)) return `mailto:${v}`;
  // Looks like a domain/URL missing its protocol
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)+([/?#].*)?$/i.test(v)) {
    return `https://${v.replace(/^\/+/, "")}`;
  }
  return null;
}

// Pull the first usable URL or email out of a free-text blob.
function extractHref(text: string | null | undefined): string | null {
  const t = text ?? "";
  const url = t.match(/https?:\/\/[^\s"'<>]+/i);
  if (url) return url[0].replace(/[.,);]+$/, "");
  const email = t.match(/[^\s@]+@[^\s@]+\.[a-z]{2,}/i);
  if (email) return `mailto:${email[0]}`;
  const domain = t.match(/\b[a-z0-9-]+(\.[a-z0-9-]+)+\/[^\s"'<>]+/i);
  if (domain) return `https://${domain[0].replace(/[.,);]+$/, "")}`;
  return null;
}

// Find a suggested email subject line. Casting posts often dictate an exact
// subject ("Subject: PHOTO DOUBLE – Your Name"); honor it when stated. Otherwise
// fall back to the gig title so the applicant opens their mail app with a
// relevant, editable subject rather than a blank one.
function extractSubject(opp: Opportunity): string | null {
  const blob = [opp.application_info, opp.requirements, opp.summary]
    .filter(Boolean)
    .join("\n");
  const direct = blob.match(
    /subject(?:\s*line)?\s*[:\-–]\s*["“']?([^"”'\n]{3,120})/i
  );
  if (direct) return direct[1].trim().replace(/[\s.]+$/, "");
  const phrase = blob.match(
    /(?:use|with|include|put|enter)\s+(?:the\s+)?subject(?:\s*line)?\s+["“']([^"”'\n]{3,120})["”']/i
  );
  if (phrase) return phrase[1].trim();
  return opp.title ? opp.title.trim() : null;
}

function withSubject(href: string, subject: string | null): string {
  if (!subject || !/^mailto:/i.test(href) || /[?&]subject=/i.test(href)) {
    return href;
  }
  const sep = href.includes("?") ? "&" : "?";
  return `${href}${sep}subject=${encodeURIComponent(subject)}`;
}

function isRelinkHost(href: string): boolean {
  let host: string;
  try {
    host = new URL(href).hostname.toLowerCase();
  } catch {
    return false;
  }
  if (!host) return false;
  return (
    host === "app.link" || host.endsWith(".app.link") ||
    host === "onelink.me" || host.endsWith(".onelink.me") ||
    host.endsWith(".page.link") ||
    host.includes("sourceandcast")
  );
}

function extractEmailHref(opp: Opportunity): string | null {
  const blob = [opp.application_info, opp.requirements, opp.summary].filter(Boolean).join("\n");
  const m = blob.match(/[^\s@]+@[^\s@]+\.[a-z]{2,}/i);
  return m ? `mailto:${m[0].replace(/[.,);]+$/, "")}` : null;
}

/** Best stored apply target (email, form, or URL). Never invents a link. */
export function getApplyHref(opp: Opportunity): string | null {
  const linkHref = normalizeHref(opp.link);
  if (linkHref && !isRelinkHost(linkHref)) return withSubject(linkHref, extractSubject(opp));

  const emailHref = extractEmailHref(opp);
  if (emailHref) return withSubject(emailHref, extractSubject(opp));

  const infoHref = extractHref(opp.application_info);
  if (infoHref && !isRelinkHost(infoHref)) return withSubject(infoHref, extractSubject(opp));

  return null;
}

/** Primary CTA the listing card already uses: apply href, else original post. */
export function listingApplyCta(opp: Opportunity): { href: string; label: string } | null {
  const applyHref = getApplyHref(opp);
  if (applyHref) {
    return {
      href: applyHref,
      label: /^mailto:/i.test(applyHref) ? "Apply via Email" : "Apply on company site",
    };
  }
  if (opp.source_url) {
    return { href: opp.source_url, label: "View original post" };
  }
  return null;
}

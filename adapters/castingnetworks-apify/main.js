// Apify actor: Casting Networks market listings → GigDock-normalized records.
//
// STATUS: production-shaped SCAFFOLD. Everything except the CN-specific
// extraction is done. The two functions marked `TODO(recon)` — extractRecords()
// and hasNextPage() — must be filled in from the live page/endpoint (DevTools →
// Network → Fetch/XHR). Until then the actor runs but returns 0 records.
//
// Guardrails (keep them): public pages only; NO login/credentials; NO CAPTCHA or
// anti-bot bypass (it stops on a challenge instead of defeating it); polite rate;
// FACTUAL fields only — it never copies the listing's description (GigDock
// generates its own summary downstream). Do not run at scale until the ToS/legal
// question is cleared.

import { Actor } from 'apify';
import { CheerioCrawler, log, sleep } from 'crawlee';

await Actor.init();

const input = (await Actor.getInput()) ?? {};
const {
  market = 'atlanta',
  startUrl = 'https://www.castingnetworks.com/atlanta-casting-calls/',
  pageParam = 'current_page', // recon confirmed this param appears on the page
  maxPages = 25,
  maxConcurrency = 1, // be polite; raise only if clearly acceptable
  minDelayMs = 1500, // delay between page fetches
  proxyConfiguration: proxyInput,
} = input;

const proxyConfiguration = proxyInput
  ? await Actor.createProxyConfiguration(proxyInput)
  : undefined;

// ---------------------------------------------------------------------------
// CN-SPECIFIC EXTRACTION — FILL IN AFTER RECON
//
// Recon determines ONE of two shapes:
//   (A) PREFERRED — the page fills its list from a public JSON endpoint. If so,
//       delete the CheerioCrawler below and fetch that endpoint directly (see
//       fetchJsonPage at the bottom). JSON is far more stable than HTML.
//   (B) The listings are in the server-rendered HTML → implement extractRecords()
//       with the real repeating-element selector and per-field selectors.
// ---------------------------------------------------------------------------

/** Return an array of RAW role records found on one page. TODO(recon). */
function extractRecords($) {
  const out = [];
  // TODO(recon): replace 'REPLACE_*' with the real selectors from the live DOM.
  $('REPLACE_LISTING_ROW_SELECTOR').each((_, el) => {
    const $el = $(el);
    const text = (sel) => $el.find(sel).first().text().trim() || null;
    out.push({
      // capture FACTUAL fields only — never the full copyrighted description
      projectName: text('REPLACE_PROJECT'),
      roleName: text('REPLACE_ROLE'),
      rate: text('REPLACE_RATE'),
      union: text('REPLACE_UNION'),
      ageRange: text('REPLACE_AGE'),
      gender: text('REPLACE_GENDER'),
      projectType: text('REPLACE_TYPE'),
      dueDate: text('REPLACE_DUE_DATE'),
      workLocation: text('REPLACE_WORK_LOCATION'), // physical, if present
      listingUrl: $el.find('a').first().attr('href') || null,
      // stable IDs if exposed (data-attrs, or parse from listingUrl) — critical
      // for grouping roles under a project and for cheap change-detection:
      projectId: $el.attr('data-project-id') || null,
      roleId: $el.attr('data-role-id') || null,
    });
  });
  return out;
}

/** Whether another results page exists after `currentPage`. TODO(recon). */
function hasNextPage($, currentPage) {
  // TODO(recon): detect via the pagination control or a total-count field.
  // e.g. return $('REPLACE_NEXT_PAGE_SELECTOR').length > 0;
  return false;
}

// ---------------------------------------------------------------------------
// NORMALIZATION → GigDock shape (this part is known and done).
// GigDock already models project + role via production_name + role_key, so the
// mapping is 1:1 with an existing schema. Enums mirror GigDock's CastingCriteria.
// ---------------------------------------------------------------------------

function parsePayMin(pay) {
  if (!pay) return null;
  const nums = [];
  for (const m of String(pay).matchAll(/\$?\s*([\d,]+(?:\.\d+)?)/g)) {
    const n = parseFloat(m[1].replace(/,/g, ''));
    if (!isNaN(n) && n >= 20) nums.push(n);
  }
  return nums.length ? Math.min(...nums) : null;
}

function parseAge(range) {
  if (!range) return {};
  const nums = (String(range).match(/\d{1,2}/g) || []).map(Number);
  if (!nums.length) return {};
  return { age_min: Math.min(...nums), age_max: nums.length > 1 ? Math.max(...nums) : undefined };
}

function normalizeGender(g) {
  if (!g) return [];
  const s = g.toLowerCase();
  const out = [];
  if (/\bmale\b|\bman\b|\bmen\b/.test(s)) out.push('male');
  if (/\bfemale\b|\bwoman\b|\bwomen\b/.test(s)) out.push('female');
  if (/non[- ]?binary|nonbinary|enby/.test(s)) out.push('non-binary');
  return out; // empty = open to all (GigDock convention)
}

function normalizeUnion(u) {
  if (!u) return undefined;
  const s = u.toLowerCase();
  if (/sag|aftra/.test(s)) return 'sag-aftra';
  if (/non[- ]?union/.test(s)) return 'non-union';
  if (/either|both/.test(s)) return 'either';
  return undefined;
}

function normalizeWorkType(t) {
  if (!t) return undefined;
  const s = t.toLowerCase();
  if (/background|\bbg\b|extra/.test(s)) return 'background';
  if (/stand[- ]?in/.test(s)) return 'stand-in';
  if (/photo[- ]?double/.test(s)) return 'photo-double';
  if (/principal|lead|speaking/.test(s)) return 'principal';
  if (/featured/.test(s)) return 'featured';
  if (/voice|vo\b/.test(s)) return 'voice-over';
  if (/model/.test(s)) return 'model';
  return 'other';
}

// Short lowercase role id, aligned with GigDock's role_key convention.
function toRoleKey(roleName) {
  if (!roleName) return null;
  return roleName.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/).slice(0, 4).join(' ') || null;
}

function normalizeForGigDock(raw, ctx) {
  const age = parseAge(raw.ageRange);
  const listingUrl = raw.listingUrl ? new URL(raw.listingUrl, ctx.startUrl).href : ctx.pageUrl;
  return {
    // provenance
    source: 'Casting Networks',
    source_type: 'castingnetworks',
    source_url: listingUrl,
    external_project_id: raw.projectId,
    external_role_id: raw.roleId,
    // project <-> role (GigDock already has these columns)
    production_name: raw.projectName,
    role_key: toRoleKey(raw.roleName),
    title: [raw.projectName, raw.roleName].filter(Boolean).join(' — ') || raw.roleName || 'Casting role',
    // factual casting specs (GigDock CastingCriteria shape)
    pay_rate: raw.rate,
    pay_min: parsePayMin(raw.rate),
    casting_specs: {
      union_status: normalizeUnion(raw.union),
      age_min: age.age_min,
      age_max: age.age_max,
      gender: normalizeGender(raw.gender),
      work_type: normalizeWorkType(raw.projectType),
    },
    apply_by: raw.dueDate || null, // GigDock parses/normalizes dates downstream
    // LOCATION — keep market-relevance and physical location SEPARATE (see recon §5):
    market_relevance: market, // "listed on the {market} board" — medium confidence, NOT shoot loc
    work_location: raw.workLocation || null, // physical shoot loc if CN exposes it
    // NOTE: intentionally NO `description` — GigDock generates its own summary.
    scraped_at: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Crawl. CheerioCrawler = lightweight HTML fetch+parse (path B). If recon shows
// the page is client-rendered with no server data, swap to PlaywrightCrawler
// (drop-in on Apify): change the import and use `page` instead of `$`.
// ---------------------------------------------------------------------------

function buildPageUrl(base, page) {
  const u = new URL(base);
  u.searchParams.set(pageParam, String(page));
  return u.href;
}

function isChallengePage($) {
  const t = ($('title').text() || '').toLowerCase();
  return /just a moment|attention required|access denied|are you a robot|captcha/.test(t);
}

const crawler = new CheerioCrawler({
  proxyConfiguration,
  maxConcurrency,
  maxRequestsPerCrawl: maxPages + 1,
  requestHandlerTimeoutSecs: 60,
  async requestHandler({ $, request, response, addRequests }) {
    const status = response?.statusCode;
    // GUARDRAIL: if we're blocked or hit a challenge, STOP — do not bypass it.
    if (status === 403 || status === 429 || isChallengePage($)) {
      log.warning(`Blocked/challenge at ${request.url} (status ${status}). Stopping — not bypassing access controls.`);
      return;
    }

    const currentPage = request.userData.page ?? 1;
    const raw = extractRecords($);
    log.info(`page ${currentPage}: ${raw.length} raw records`);

    for (const r of raw) {
      await Actor.pushData(normalizeForGigDock(r, { market, startUrl, pageUrl: request.url }));
    }

    await sleep(minDelayMs); // politeness

    if (currentPage < maxPages && hasNextPage($, currentPage)) {
      await addRequests([{ url: buildPageUrl(startUrl, currentPage + 1), userData: { page: currentPage + 1 } }]);
    }
  },
  failedRequestHandler({ request, error }) {
    log.error(`Request failed: ${request.url} — ${error?.message}`);
  },
});

await crawler.run([{ url: startUrl, userData: { page: 1 } }]);

log.info('Done. Records are in the default dataset; pull them into GigDock ingestion.');
await Actor.exit();

// ---------------------------------------------------------------------------
// PATH A ALTERNATIVE (preferred if recon finds a JSON endpoint). Replace the
// CheerioCrawler block above with a simple paginated fetch like this:
//
// let page = 1;
// while (page <= maxPages) {
//   const url = `RECON_JSON_ENDPOINT?market=${market}&${pageParam}=${page}`;
//   const res = await fetch(url, { headers: { accept: 'application/json' } });
//   if (res.status === 403 || res.status === 429) { log.warning('blocked; stop'); break; }
//   const data = await res.json();
//   const rows = data.RECON_RESULTS_PATH ?? [];
//   if (!rows.length) break;
//   for (const r of rows) await Actor.pushData(normalizeForGigDock(mapJson(r), { market, startUrl, pageUrl: url }));
//   await sleep(minDelayMs);
//   page += 1;
// }
// ---------------------------------------------------------------------------

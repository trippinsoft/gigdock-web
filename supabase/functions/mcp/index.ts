// GigDock MCP server (read-only slice).
//
// Remote MCP endpoint over Streamable HTTP:
//   https://www.gigdock.co/mcp
//
// Auth: `Authorization: Bearer gd_...` — a personal or OAuth access token.
// Tokens are validated inside the mcp_* Postgres functions, which impersonate
// that user and call the same calculators the web/mobile apps use. This
// function is deployed with verify_jwt=false because the bearer is a GigDock
// token, not a Supabase JWT.
//
// Contract: GigDock owns financial logic. Tools return finished answers.
// Models must never reconstruct pay from list_gigs (rate × dates, etc.).

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const PROTOCOL_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"];

const SERVER_INSTRUCTIONS =
  "GigDock tracks the user's gigs, hours, earnings and payments. Amounts are USD gross unless stated. " +
  "GigDock is the only authority for money. Never calculate, estimate, or reconstruct earnings, received, outstanding, " +
  "worked-day counts, or averages from list_gigs, from a day rate, or from counting dates. " +
  "Only dates with status 'worked' (earns=true) generate earnings. Booked and availability-check dates earn $0. " +
  "Do not use any leftover/legacy rate text if you ever see it. Structured pay is display-only — never multiply pay.amount by the number of dates. " +
  "Earned = what was earned from worked dates. Received = cash recorded; it can include payments for earlier work, so received may exceed earned in the same month. Outstanding = earned − received. " +
  "Tool routing: " +
  "(1) Period totals ('last month', 'in August') → get_earnings with concrete start_date/end_date. " +
  "(2) 'How much from [company / casting director / production]?' → get_earnings_by_company. " +
  "(3) One gig by name or id → get_gig_financials. " +
  "(4) list_gigs is discovery only (find ids/titles/date statuses). After you have a gig id, call get_gig_financials for money. " +
  "If GigDock's number disagrees with rate × days, trust GigDock and explain using dates[].earned, dates[].base_pay_applies, and dates[].bumps — do not substitute your own total.";

const TOOLS = [
  {
    name: "get_earnings",
    title: "Get earnings summary",
    description:
      "AUTHORITATIVE earnings for an optional date window: gross_earned, received, outstanding, gig count, days worked, averages. " +
      "Never independently recompute these from list_gigs. " +
      "Omit both dates for all-time. For 'last month' or 'in May', compute concrete start_date/end_date first and call once per period. " +
      "gross_earned is what was earned from worked dates. received is cash recorded and may include payments for earlier work.",
    inputSchema: {
      type: "object",
      properties: {
        start_date: { type: "string", format: "date", description: "Inclusive start date (YYYY-MM-DD). Omit for no lower bound." },
        end_date: { type: "string", format: "date", description: "End date (YYYY-MM-DD). Omit for no upper bound." },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_earnings_by_company",
    title: "Get earnings by company",
    description:
      "AUTHORITATIVE earnings for one company, casting director, payroll company, or gig title (fuzzy match). " +
      "Use this for questions like 'how much did I earn from Rose Locke?' Do not answer those from list_gigs. " +
      "Returns gross_earned, received, outstanding, worked_days, and each matching gig with per-date status and earned. " +
      "Only status 'worked' earns. Trust gross_earned; never multiply the day rate by the date count. " +
      "Optional start_date/end_date limit to worked dates (and payments) in that inclusive window.",
    inputSchema: {
      type: "object",
      properties: {
        company: { type: "string", description: "Company, casting director, payroll company, or gig title to match." },
        start_date: { type: "string", format: "date", description: "Inclusive start date (YYYY-MM-DD)." },
        end_date: { type: "string", format: "date", description: "Inclusive end date (YYYY-MM-DD)." },
      },
      required: ["company"],
      additionalProperties: false,
    },
  },
  {
    name: "get_gig_financials",
    title: "Get gig financials",
    description:
      "AUTHORITATIVE financials for one gig: gross_earned, received, outstanding, pay setup, and every date with status, whether it earns, bumps, base_pay_applies, and earned. " +
      "Use this after list_gigs (or when the user names a gig). Never recompute the total from the day rate. " +
      "If a worked date has base_pay_applies=false, the day/flat/hourly rate is not applied that day — only bumps earn.",
    inputSchema: {
      type: "object",
      properties: {
        gig_id: { type: "string", format: "uuid", description: "Gig id from list_gigs or get_earnings_by_company." },
      },
      required: ["gig_id"],
      additionalProperties: false,
    },
  },
  {
    name: "list_gigs",
    title: "List gigs",
    description:
      "Discovery only — titles, companies, date statuses, and GigDock's gross_earned/received/outstanding. " +
      "Do not calculate earnings from this tool. Do not assume every listed date was worked. Only dates with earns=true (status worked) generate earnings. " +
      "pay_type is informational; there is no rate amount here on purpose. For money questions use get_earnings, get_earnings_by_company, or get_gig_financials. " +
      "Optional filter: 'payments_due' (worked, not fully paid), 'missing_payment' (pay model incomplete), 'missing_dates'. Optional search matches title, company, payroll company, and project.",
    inputSchema: {
      type: "object",
      properties: {
        filter: { type: "string", enum: ["payments_due", "missing_payment", "missing_dates"], description: "Needs-attention bucket to narrow to." },
        search: { type: "string", description: "Match title, company, payroll company, or project." },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_outstanding",
    title: "Get outstanding items",
    description:
      "What still needs attention: count and total of payments due, gigs with an incomplete pay model, and gigs missing work dates. " +
      "Payments-due totals come from GigDock; do not recompute them from list_gigs.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
];

async function callRpc(fn: string, args: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      apikey: SERVICE_ROLE_KEY,
      authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify(args),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const message = typeof body?.message === "string" ? body.message : `rpc ${fn} failed (${res.status})`;
    throw new Error(message);
  }
  return body;
}

const CORS: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, GET, OPTIONS",
  "access-control-allow-headers": "authorization, content-type, mcp-protocol-version, mcp-session-id",
};

function json(status: number, payload: unknown, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json", ...CORS, ...extra },
  });
}

function unauthorized(): Response {
  return json(401, { error: "invalid_token", message: "Provide a GigDock access token: Authorization: Bearer gd_..." }, {
    "www-authenticate":
      'Bearer realm="GigDock MCP", error="invalid_token", resource_metadata="https://www.gigdock.co/.well-known/oauth-protected-resource/mcp"',
  });
}

function rpcError(id: unknown, code: number, message: string) {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message } };
}

function toolResult(id: unknown, data: unknown) {
  const structured = Array.isArray(data) ? { items: data } : (data ?? {});
  return {
    jsonrpc: "2.0",
    id,
    result: {
      content: [{ type: "text", text: JSON.stringify(data ?? {}, null, 2) }],
      structuredContent: structured,
      isError: false,
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method === "GET") {
    return json(405, { error: "method_not_allowed", message: "POST JSON-RPC messages to this endpoint." }, { allow: "POST" });
  }
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" }, { allow: "POST" });

  const auth = req.headers.get("authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!token.startsWith("gd_")) return unauthorized();

  let msg: { jsonrpc?: string; id?: unknown; method?: string; params?: Record<string, unknown> };
  try {
    msg = await req.json();
  } catch {
    return json(400, rpcError(null, -32700, "Parse error"));
  }
  if (Array.isArray(msg)) return json(400, rpcError(null, -32600, "Batching is not supported"));

  const { id, method, params } = msg ?? {};

  if (id === undefined || id === null) return new Response(null, { status: 202, headers: CORS });

  try {
    switch (method) {
      case "initialize": {
        const requested = String((params as Record<string, unknown> | undefined)?.protocolVersion ?? "");
        const protocolVersion = PROTOCOL_VERSIONS.includes(requested) ? requested : PROTOCOL_VERSIONS[0];
        return json(200, {
          jsonrpc: "2.0",
          id,
          result: {
            protocolVersion,
            capabilities: { tools: { listChanged: false } },
            serverInfo: { name: "gigdock", title: "GigDock", version: "1.1.0" },
            instructions: SERVER_INSTRUCTIONS,
          },
        });
      }
      case "ping":
        return json(200, { jsonrpc: "2.0", id, result: {} });
      case "tools/list":
        return json(200, { jsonrpc: "2.0", id, result: { tools: TOOLS } });
      case "tools/call": {
        const name = String((params as Record<string, unknown> | undefined)?.name ?? "");
        const args = ((params as Record<string, unknown> | undefined)?.arguments ?? {}) as Record<string, unknown>;
        let data: unknown;
        if (name === "get_earnings") {
          data = await callRpc("mcp_get_earnings", {
            p_token: token,
            p_start: args.start_date ?? null,
            p_end: args.end_date ?? null,
          });
        } else if (name === "get_earnings_by_company") {
          data = await callRpc("mcp_get_earnings_by_company", {
            p_token: token,
            p_company: args.company ?? "",
            p_start: args.start_date ?? null,
            p_end: args.end_date ?? null,
          });
        } else if (name === "get_gig_financials") {
          data = await callRpc("mcp_get_gig_financials", {
            p_token: token,
            p_gig_id: args.gig_id ?? null,
          });
        } else if (name === "list_gigs") {
          data = await callRpc("mcp_list_gigs", {
            p_token: token,
            p_filter: args.filter ?? null,
            p_search: args.search ?? null,
          });
        } else if (name === "get_outstanding") {
          data = await callRpc("mcp_get_outstanding", { p_token: token });
        } else {
          return json(200, rpcError(id, -32602, `Unknown tool: ${name}`));
        }
        return json(200, toolResult(id, data));
      }
      default:
        return json(200, rpcError(id, -32601, `Method not found: ${method}`));
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("invalid_token")) return unauthorized();
    return json(200, {
      jsonrpc: "2.0",
      id,
      result: {
        content: [{ type: "text", text: `GigDock error: ${message}` }],
        isError: true,
      },
    });
  }
});

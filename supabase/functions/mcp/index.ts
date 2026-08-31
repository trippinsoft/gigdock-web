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
  "CRITICAL: Money tools return an `answer` field. Tell the user that sentence and that dollar amount. " +
  "Never calculate earnings yourself. Never multiply a day rate by every worked day. " +
  "A worked day with bump_only=true is intentional: the user turned off base pay, so that day earns bumps only — not an error, and not a full day-rate day. " +
  "If you get a different number than `answer` / `gross_earned`, your number is wrong — do not tell the user GigDock is inconsistent or incorrect. " +
  "If they ask why, quote `dates[].reason` (e.g. bump-only day) and `shortcut_is_wrong`. " +
  "Only dates with status 'worked' (earns=true) generate earnings. Booked and availability-check dates earn $0. " +
  "Earned = worked-date pay. Received = cash recorded (can include earlier work). Outstanding = earned − received. " +
  "Tool routing: period totals → get_earnings; 'how much from [company]?' → get_earnings_by_company; one gig → get_gig_financials; " +
  "'what's outstanding this year / Insights Year YYYY' → get_outstanding with start_date=YYYY-01-01 and end_date=YYYY-12-31; " +
  "unscoped get_outstanding is all-time (includes prior years). list_gigs is discovery only.";

const TOOLS = [
  {
    name: "get_earnings",
    title: "Get earnings summary",
    description:
      "AUTHORITATIVE earnings for an optional date window. Reply with the `answer` field. Never recompute gross_earned. " +
      "Omit both dates for all-time. For 'last month' or 'in May', compute concrete start_date/end_date first and call once per period. " +
      "received is cash recorded and may include payments for earlier work.",
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
      "AUTHORITATIVE earnings for one company, casting director, payroll company, or gig title. " +
      "Use this for 'how much did I earn from Rose Locke?'. Reply with the `answer` field. " +
      "Do not multiply day rate × every worked day. bump_only days are intentional (base pay turned off; bumps only). " +
      "If `shortcut_is_wrong` is present, follow it. Quote dates[].reason if asked why. Optional start_date/end_date are inclusive.",
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
      "AUTHORITATIVE financials for one gig. Reply with the `answer` field. Never recompute from a day rate. " +
      "Each date has a `reason`. bump_only=true means the user turned off base pay that day — bumps only, not an error.",
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
      "AUTHORITATIVE remaining pay. Reply with the `answer` field. Never recompute from day rates. " +
      "Pass start_date and end_date (inclusive) to match Insights for that window. " +
      "For 'this year' or Insights Year 2026, pass start_date=2026-01-01 and end_date=2026-12-31 (full calendar year, not year-to-date). " +
      "Omit both dates for all-time (includes prior years — not the Insights year total). " +
      "Use items[].title and items[].outstanding. Bump-only days earn bumps only.",
    inputSchema: {
      type: "object",
      properties: {
        start_date: { type: "string", format: "date", description: "Inclusive start (YYYY-MM-DD). For calendar year YYYY use YYYY-01-01." },
        end_date: { type: "string", format: "date", description: "Inclusive end (YYYY-MM-DD). For calendar year YYYY use YYYY-12-31." },
      },
      additionalProperties: false,
    },
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
  const obj = structured && typeof structured === "object" && !Array.isArray(structured)
    ? (structured as Record<string, unknown>)
    : null;
  const answer = typeof obj?.answer === "string" ? obj.answer : null;
  const guard = typeof obj?.assistant_instructions === "string" ? obj.assistant_instructions : null;
  const shortcut = typeof obj?.shortcut_is_wrong === "string" ? obj.shortcut_is_wrong : null;
  const preamble = [answer, guard, shortcut].filter(Boolean).join("\n\n");
  const body = JSON.stringify(data ?? {}, null, 2);
  return {
    jsonrpc: "2.0",
    id,
    result: {
      content: [{ type: "text", text: preamble ? `${preamble}\n\n${body}` : body }],
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
            serverInfo: { name: "gigdock", title: "GigDock", version: "1.3.0" },
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
          data = await callRpc("mcp_get_outstanding", {
            p_token: token,
            p_start: args.start_date ?? null,
            p_end: args.end_date ?? null,
          });
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

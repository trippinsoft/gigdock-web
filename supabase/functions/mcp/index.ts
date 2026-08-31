// GigDock MCP server (read-only slice).
//
// Remote MCP endpoint over Streamable HTTP:
//   https://<project>.supabase.co/functions/v1/mcp
//
// Auth: `Authorization: Bearer gd_...` — a personal access token minted in
// GigDock Settings (mcp_create_token). The token is validated inside the
// mcp_* Postgres functions, which impersonate that user and call the same
// RPCs the web/mobile apps use, so RLS scopes every answer to the token's
// owner. This function is deployed with verify_jwt=false because the bearer
// token is a GigDock token, not a Supabase JWT; nothing here trusts the
// caller without mcp__auth() accepting the token.
//
// Tools (all read-only):
//   get_earnings(start_date?, end_date?)  → gross / received / outstanding…
//   list_gigs(filter?, search?)           → the user's gigs
//   get_outstanding()                     → payments due / missing info
//
// Writes are intentionally NOT exposed in this slice.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const PROTOCOL_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"];

const TOOLS = [
  {
    name: "get_earnings",
    title: "Get earnings summary",
    description:
      "The user's gig earnings for an optional date window: gross earned, amount received, outstanding (earned − received), gig count, days worked and averages. " +
      "Omit both dates for all-time. For questions like 'last month' or 'in May', compute the concrete start_date/end_date first and call once per period being compared.",
    inputSchema: {
      type: "object",
      properties: {
        start_date: { type: "string", format: "date", description: "Inclusive start date (YYYY-MM-DD). Omit for no lower bound." },
        end_date: { type: "string", format: "date", description: "Inclusive end date (YYYY-MM-DD). Omit for no upper bound." },
      },
      additionalProperties: false,
    },
  },
  {
    name: "list_gigs",
    title: "List gigs",
    description:
      "The user's gigs with per-gig earned/paid/remaining amounts and dates, newest first. " +
      "Optional filter: 'payments_due' (worked, not fully paid), 'missing_payment' (pay model incomplete), 'missing_dates' (no work dates recorded). Optional text search on the title.",
    inputSchema: {
      type: "object",
      properties: {
        filter: { type: "string", enum: ["payments_due", "missing_payment", "missing_dates"], description: "Needs-attention bucket to narrow to." },
        search: { type: "string", description: "Match against gig titles." },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_outstanding",
    title: "Get outstanding items",
    description:
      "What still needs attention: count and total of payments due, gigs with an incomplete pay model, and gigs missing work dates.",
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
    "www-authenticate": 'Bearer realm="GigDock MCP", error="invalid_token"',
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
    // No server-initiated stream in this slice.
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

  // Notifications (no id) need no body.
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
            serverInfo: { name: "gigdock", title: "GigDock", version: "1.0.0" },
            instructions:
              "GigDock tracks the user's gigs, hours, earnings and payments. Amounts are USD gross unless stated. " +
              "'Outstanding' means earned but not yet received. For period comparisons, call get_earnings once per period with concrete dates.",
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

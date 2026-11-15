// The MCP endpoint: Streamable HTTP, stateless, JSON responses only (no event streams, no
// sessions). Each request carries the user's Supabase access token, issued to Claude by Supabase
// Auth's OAuth server after the user signs in and approves on the consent page (consent.tsx).
//
//   POST <base>                                         JSON-RPC: initialize, tools/list, tools/call, ping
//   GET  <base>/.well-known/oauth-protected-resource    where to sign in (RFC 9728)
//
// Without a valid token the answer is 401 with a WWW-Authenticate header pointing at that
// metadata, which is how Claude finds Supabase's sign-in and starts OAuth.
import type { SupabaseClient } from "@supabase/supabase-js"
import { supabaseBackend, type Backend, type PantryData } from "./backend"
import { callTool, tools } from "./tools"

export type ServerOptions = {
  /** The project's URL, https://<ref>.supabase.co. */
  supabaseUrl: string
  /** Public URL of this endpoint. */
  baseUrl: string
  /** Checks a token and returns a client that acts as that user, or null if the token is no good. */
  clientFor: (token: string) => Promise<SupabaseClient | null>
  /** Tests swap the backend for one in memory. */
  backendFor?: (client: SupabaseClient) => Backend
  now?: () => Date
}

const PROTOCOL_VERSIONS = ["2025-11-25", "2025-06-18", "2025-03-26"]

const INSTRUCTIONS = `This is Isaac's pantry: stock, the shopping list and recipes, shared with his pantry app (desktop) and shopping app (phone). Write in British English.
Rules (fixed, not settings):
- Read and search freely.
- Add items, stock, shopping list entries and recipes without asking.
- When he says what he's used, take it off stock with record_used without asking. That isn't an edit.
- Any other edit or delete: describe the change and ask him in the chat first. Those tools need confirmed: true and refuse without it.
- Use the categories that exist. Don't invent one; ask if nothing fits.
Saving a recipe: run match_ingredients, link clear matches, create new items (minimum 0) for ingredients with nothing similar, and ask when an ingredient could mean more than one item. Then say what you linked, created and asked about.
"What can I cook?": find_recipes, can_cook first, then nearly. Recipes that use up food going off soon come first.
A Staple is an item with a minimum above 0. It goes on the shopping list by itself when it drops below the minimum. Bulk items (flour, rice) are counted in whole packs, and an open pack doesn't count towards the minimum.
Every change shows in the pantry app's History, marked Claude, and can be undone there the same day.`

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...CORS, ...headers } })

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, Mcp-Protocol-Version, Mcp-Session-Id",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Expose-Headers": "WWW-Authenticate, Mcp-Session-Id",
}

type RpcRequest = { jsonrpc: "2.0"; id?: string | number | null; method: string; params?: Record<string, unknown> }

export function createHandler(opts: ServerOptions) {
  const metadataUrl = `${opts.baseUrl}/.well-known/oauth-protected-resource`
  const metadata = {
    resource: opts.baseUrl,
    authorization_servers: [`${opts.supabaseUrl}/auth/v1`],
    bearer_methods_supported: ["header"],
    resource_name: "Pantry",
  }
  const unauthorised = (why: string) =>
    json({ error: "invalid_token", error_description: why }, 401, { "WWW-Authenticate": `Bearer resource_metadata="${metadataUrl}"` })

  return async function handle(req: Request): Promise<Response> {
    const path = new URL(req.url).pathname
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS })
    if (path.endsWith("/.well-known/oauth-protected-resource")) return json(metadata)
    if (req.method === "GET") return json({ error: "This endpoint takes POST. There's no event stream." }, 405, { Allow: "POST" })
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, { Allow: "POST" })

    const token = req.headers.get("Authorization")?.match(/^Bearer\s+(.+)$/i)?.[1]
    if (!token) return unauthorised("Sign in to the pantry first.")
    const client = await opts.clientFor(token)
    if (!client) return unauthorised("The sign-in has expired or was revoked.")
    const backend = (opts.backendFor ?? supabaseBackend)(client)
    let cached: Promise<PantryData> | null = null
    const data = () => (cached ??= backend.load())

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, 400)
    }
    const batch = Array.isArray(body)
    const messages = (batch ? body : [body]) as RpcRequest[]
    const replies = []
    for (const m of messages) {
      const reply = await answer(m, backend, data, opts.now ?? (() => new Date()))
      if (reply) replies.push(reply)
    }
    // Notifications and responses get no reply.
    if (!replies.length) return new Response(null, { status: 202, headers: CORS })
    return json(batch ? replies : replies[0])
  }
}

async function answer(m: RpcRequest, backend: Backend, data: () => Promise<PantryData>, now: () => Date) {
  if (!m || typeof m !== "object" || typeof m.method !== "string") {
    // A response from the client, or junk. Only requests (with an id) get an error back.
    return m && "id" in m && !("result" in m) && !("error" in m) ? { jsonrpc: "2.0", id: m.id ?? null, error: { code: -32600, message: "Invalid request" } } : null
  }
  if (m.id === undefined || m.id === null) return null // a notification, such as notifications/initialized
  const ok = (result: unknown) => ({ jsonrpc: "2.0", id: m.id, result })
  switch (m.method) {
    case "initialize": {
      const asked = typeof m.params?.protocolVersion === "string" ? m.params.protocolVersion : ""
      return ok({
        protocolVersion: PROTOCOL_VERSIONS.includes(asked) ? asked : PROTOCOL_VERSIONS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "pantry", title: "Pantry", version: "0.1.0" },
        instructions: INSTRUCTIONS,
      })
    }
    case "ping":
      return ok({})
    case "tools/list":
      return ok({ tools: tools.map(({ name, title, description, inputSchema, annotations }) => ({ name, title, description, inputSchema, annotations: { title, ...annotations, openWorldHint: false } })) })
    case "tools/call": {
      const name = typeof m.params?.name === "string" ? m.params.name : ""
      const args = (m.params?.arguments ?? {}) as Record<string, unknown>
      return ok(await callTool(name, args, { backend, data, now }))
    }
    case "resources/list":
      return ok({ resources: [] })
    case "prompts/list":
      return ok({ prompts: [] })
    default:
      return { jsonrpc: "2.0", id: m.id, error: { code: -32601, message: `Method not found: ${m.method}` } }
  }
}

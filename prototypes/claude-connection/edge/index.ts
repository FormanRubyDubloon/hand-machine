// The Supabase Edge Function entry (Deno). `pnpm build:mcp` bundles this, with the server in
// ../src and the pantry app's rules it imports, into supabase/functions/mcp/index.js, which
// `supabase functions deploy mcp` uploads. Kept out of the app's tsconfig: Deno resolves the
// npm: specifier, Node and Vite don't.
import { createClient } from "npm:@supabase/supabase-js@2.119.0"
import { createHandler } from "../src/server"

declare const Deno: { env: { get(name: string): string | undefined }; serve(handler: (req: Request) => Promise<Response>): void }

const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!

const handle = createHandler({
  supabaseUrl,
  baseUrl: `${supabaseUrl}/functions/v1/mcp`,
  async clientFor(token) {
    const client = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    })
    // Asks Supabase Auth, so a revoked grant or a signed-out session stops working straight away.
    const { data, error } = await client.auth.getUser(token)
    return error || !data.user ? null : client
  },
})

Deno.serve(handle)

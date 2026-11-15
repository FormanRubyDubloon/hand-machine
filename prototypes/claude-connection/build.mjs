// Bundles the Claude connection's server into one file for Supabase Edge Functions.
// Run with `pnpm build:mcp`, then `supabase functions deploy mcp --use-api --no-verify-jwt`.
import { build } from "esbuild"
import { options } from "./build-options.mjs"

await build({ ...options, logLevel: "info" })

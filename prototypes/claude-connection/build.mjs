// Bundles the Claude connection's server into one file for Supabase Edge Functions.
// Run with `pnpm build:mcp`, then `supabase functions deploy mcp --use-api`.
import { build } from "esbuild"
import { fileURLToPath } from "node:url"

const here = (p) => fileURLToPath(new URL(p, import.meta.url))

await build({
  entryPoints: [here("./edge/index.ts")],
  outfile: here("../../supabase/functions/mcp/index.js"),
  bundle: true,
  format: "esm",
  platform: "neutral",
  target: "es2022",
  external: ["npm:*"],
  banner: { js: "// Built by prototypes/claude-connection/build.mjs. Don't edit: change the source and run pnpm build:mcp." },
  logLevel: "info",
})

// How the Claude connection's server is bundled for Supabase Edge Functions. Shared by build.mjs
// (which writes the bundle) and test/bundle.test.ts (which checks the committed bundle is current).
import { fileURLToPath } from "node:url"

const here = (p) => fileURLToPath(new URL(p, import.meta.url))

export const outfile = here("../../supabase/functions/mcp/index.js")

/** @type {import("esbuild").BuildOptions} */
export const options = {
  entryPoints: [here("./edge/index.ts")],
  outfile,
  bundle: true,
  format: "esm",
  platform: "neutral",
  target: "es2022",
  external: ["npm:*"],
  banner: { js: "// Built by prototypes/claude-connection/build.mjs. Don't edit: change the source and run pnpm build:mcp." },
}

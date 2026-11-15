// The server is deployed from the committed bundle, supabase/functions/mcp/index.js. It includes the
// pantry app's rules (model.ts), so a change there, or to the server, needs `pnpm build:mcp` too.
// This fails when the committed bundle no longer matches what the source would build.
import { readFileSync } from "node:fs"
import { build } from "esbuild"
import { expect, it } from "vitest"
// @ts-expect-error: plain JS module, shared with build.mjs
import { options, outfile } from "../build-options.mjs"

it("the committed MCP bundle matches the source (run pnpm build:mcp, then redeploy)", async () => {
  const result = await build({ ...options, write: false, logLevel: "silent" })
  const fresh = result.outputFiles[0].text
  const committed = readFileSync(outfile, "utf8")
  expect(committed === fresh, "supabase/functions/mcp/index.js is out of date. Run pnpm build:mcp, commit it, and redeploy the mcp function.").toBe(true)
})

// Tests for the phone's logic (list, merge, actions, phrases, sync). They run in Node; no React Native needed.
// The Supabase client is swapped for a stub; the sync test mocks the reads and writes.
import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: { alias: { "@/lib/supabase": fileURLToPath(new URL("./test/stubs/supabase.ts", import.meta.url)) } },
  test: { include: ["test/**/*.test.ts"], environment: "node" },
})

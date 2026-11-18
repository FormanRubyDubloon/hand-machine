import { describe, expect, it } from "vitest"
import { createHandler } from "../src/server"
import { normalise } from "../../pantry-app/src/model"
import { toItem, toRow, type Row } from "../../shared/src/rows"
import { fixture } from "./fixture"
import { memoryBackend } from "./memory-backend"

function setup() {
  const mem = memoryBackend(fixture())
  const handle = createHandler({
    supabaseUrl: "https://example.supabase.co",
    baseUrl: "https://example.supabase.co/functions/v1/mcp",
    clientFor: async () => ({}) as never,
    backendFor: () => mem.backend,
    now: () => new Date("2026-11-15T12:00:00Z"),
  })
  const call = async (name: string, args: Record<string, unknown> = {}) => {
    const res = await handle(new Request("https://x/functions/v1/mcp", {
      method: "POST",
      headers: { Authorization: "Bearer good", "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } }),
    }))
    const r = await res.json()
    return { text: r.result.content[0].text as string, isError: !!r.result.isError }
  }
  return { mem, call }
}

describe("ordered", () => {
  it("marks something on the list as ordered, after asking, and the list says so", async () => {
    const { mem, call } = setup()
    expect((await call("update_item", { item: "eggs", changes: { ordered: true } })).isError).toBe(true)
    const done = await call("update_item", { item: "eggs", changes: { ordered: true }, confirmed: true })
    expect(done.text).toContain("on the shopping list, already ordered")
    expect(mem.state.items.eggs.ordered).toBe(true)
    expect((await call("get_shopping_list")).text).toMatch(/\[id: eggs\] · ORDERED ·/)
    expect(mem.history[0].detail).toBe("Marked as ordered")
  })

  it("won't mark something that isn't on the list", async () => {
    const { mem, call } = setup()
    const r = await call("update_item", { item: "red-onions", changes: { ordered: true }, confirmed: true })
    expect(r.isError).toBe(true)
    expect(r.text).toContain("isn't on the shopping list")
    expect(mem.state.items["red-onions"].ordered).toBeUndefined()
  })

  it("clears by itself once the item is no longer needed", async () => {
    const { mem, call } = setup()
    await call("update_item", { item: "eggs", changes: { ordered: true }, confirmed: true })
    await call("add_stock", { item: "eggs", amount: 2 })
    expect(mem.state.items.eggs.ordered).toBeUndefined()
  })

  it("survives a round trip through the database row, and normalise keeps it while needed", () => {
    const eggs = { ...fixture().items.eggs, ordered: true }
    const row = toRow(eggs, new Set()) as unknown as Row
    expect(row.ordered).toBe(true)
    expect(toItem({ ...row, list_entries: [] }).ordered).toBe(true)
    expect(normalise(eggs).ordered).toBe(true)
    expect(normalise({ ...eggs, inStock: 6 }).ordered).toBeUndefined()
  })
})

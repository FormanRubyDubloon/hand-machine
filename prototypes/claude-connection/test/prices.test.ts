import { describe, expect, it } from "vitest"
import { createHandler } from "../src/server"
import { listRows, listTotal } from "../../pantry-app/src/model"
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

describe("prices", () => {
  it("search_pantry shows the price, and can find items with none", async () => {
    const { mem, call } = setup()
    mem.state.items.eggs.price = 30
    mem.state.items.rice.price = 180
    mem.state.items.rice.priceEstimate = true
    const eggs = await call("search_pantry", { query: "eggs" })
    expect(eggs.text).toContain("£0.30 each")
    expect(eggs.text).not.toContain("estimate")
    expect((await call("search_pantry", { query: "rice" })).text).toContain("£1.80 each (estimate)")
    const none = await call("search_pantry", { filter: "no_price" })
    expect(none.text).toContain("Red onions")
    expect(none.text).not.toContain("Eggs")
    expect((await call("search_pantry", { filter: "estimated_price" })).text).toMatch(/^1 item:\n.*Rice/)
  })

  it("get_shopping_list gives each line's cost and a total that counts unpriced lines", async () => {
    const { mem, call } = setup()
    const before = await call("get_shopping_list")
    expect(before.text).toContain("No estimated total: nothing on the list has a price yet (1 thing).")
    expect(before.text).toContain("· no price")
    mem.state.items.eggs.price = 30
    const after = await call("get_shopping_list")
    expect(after.text).toContain("Estimated total £0.60.")
    expect(after.text).toMatch(/eggs.*· £0\.60$/im)
  })

  it("set_prices asks first, then sets them all in one History entry, marked as estimates", async () => {
    const { mem, call } = setup()
    const prices = [{ item: "eggs", price_pence: 30 }, { item: "Rice", price_pence: 180 }]
    const asked = await call("set_prices", { prices, estimate: true })
    expect(asked.isError).toBe(true)
    expect(mem.state.items.eggs.price).toBeUndefined()

    const done = await call("set_prices", { prices, estimate: true, confirmed: true })
    expect(done.isError).toBe(false)
    expect(done.text).toContain("Eggs none → £0.30 (estimate)")
    expect(done.text).toContain("about £0.60, 1 price is an estimate")
    expect(mem.state.items.eggs).toMatchObject({ price: 30, priceEstimate: true })
    expect(mem.state.items.rice).toMatchObject({ price: 180, priceEstimate: true })
    expect(mem.history).toHaveLength(1)
    expect(mem.history[0].title).toBe("Set estimated prices for 2 items")
    expect(mem.history[0].item_ids).toEqual(["eggs", "rice"])
  })

  it("set_prices changes nothing when one item is unknown or a price is bad", async () => {
    const { mem, call } = setup()
    expect((await call("set_prices", { prices: [{ item: "eggs", price_pence: 30 }, { item: "caviar", price_pence: 9000 }], estimate: true, confirmed: true })).isError).toBe(true)
    expect((await call("set_prices", { prices: [{ item: "eggs", price_pence: 0 }], estimate: false, confirmed: true })).isError).toBe(true)
    expect((await call("set_prices", { prices: [{ item: "eggs", price_pence: 30 }], confirmed: true })).isError).toBe(true)
    expect(mem.state.items.eggs.price).toBeUndefined()
    expect(mem.history).toHaveLength(0)
  })

  it("a price the user gives clears the estimate mark", async () => {
    const { mem, call } = setup()
    await call("set_prices", { prices: [{ item: "eggs", price_pence: 30 }], estimate: true, confirmed: true })
    await call("update_item", { item: "eggs", changes: { price_pence: 35 }, confirmed: true })
    expect(mem.state.items.eggs.price).toBe(35)
    expect(mem.state.items.eggs.priceEstimate).toBeUndefined()
    expect((await call("get_shopping_list")).text).toContain("Estimated total £0.70.")
    await call("set_prices", { prices: [{ item: "eggs", price_pence: 40 }], estimate: false, confirmed: true })
    expect(mem.state.items.eggs.priceEstimate).toBeUndefined()
  })
})

describe("listTotal and the row mapping", () => {
  it("is approximate when a row has no price or an estimated one", () => {
    const items = fixture().items
    items.eggs.price = 30
    expect(listTotal(listRows(items))).toEqual({ pence: 60, unpriced: 0, estimated: 0, approximate: false })
    items.eggs.priceEstimate = true
    expect(listTotal(listRows(items))).toMatchObject({ pence: 60, estimated: 1, approximate: true })
  })

  it("keeps the estimate mark through a round trip, and drops it with the price", () => {
    const i = { ...fixture().items.eggs, price: 30, priceEstimate: true }
    const row = toRow(i, new Set()) as unknown as Row
    expect(row.price_is_estimate).toBe(true)
    expect(toItem({ ...row, list_entries: [] }).priceEstimate).toBe(true)
    expect((toRow({ ...i, price: undefined }, new Set()) as unknown as Row).price_is_estimate).toBe(false)
  })
})

import { describe, expect, it } from "vitest"
import { createHandler } from "../src/server"
import { needOf } from "../../pantry-app/src/model"
import { fixture } from "./fixture"
import { memoryBackend } from "./memory-backend"

const NOW = new Date("2026-11-15T12:00:00Z")

function setup() {
  const mem = memoryBackend(fixture())
  const handle = createHandler({
    supabaseUrl: "https://example.supabase.co",
    baseUrl: "https://example.supabase.co/functions/v1/mcp",
    clientFor: async (token) => (token === "good" ? ({} as never) : null),
    backendFor: () => mem.backend,
    now: () => NOW,
  })
  let id = 0
  const rpc = async (method: string, params?: unknown, token = "good") => {
    const res = await handle(new Request("https://x/functions/v1/mcp", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: ++id, method, params }),
    }))
    return res.status === 202 ? null : res.json()
  }
  const call = async (name: string, args: Record<string, unknown> = {}) => {
    const r = await rpc("tools/call", { name, arguments: args })
    return { text: r.result.content[0].text as string, isError: !!r.result.isError }
  }
  return { mem, handle, rpc, call }
}

describe("protocol", () => {
  it("asks for sign-in without a token, pointing at the metadata", async () => {
    const { handle } = setup()
    const res = await handle(new Request("https://x/functions/v1/mcp", { method: "POST", body: "{}" }))
    expect(res.status).toBe(401)
    expect(res.headers.get("WWW-Authenticate")).toContain('resource_metadata="https://example.supabase.co/functions/v1/mcp/.well-known/oauth-protected-resource"')
  })

  it("rejects a bad token", async () => {
    const { rpc } = setup()
    // rpc returns the JSON body; a 401 body has an error field
    expect((await rpc("ping", {}, "bad")).error).toBe("invalid_token")
  })

  it("serves the protected resource metadata without a token", async () => {
    const { handle } = setup()
    const res = await handle(new Request("https://x/functions/v1/mcp/.well-known/oauth-protected-resource"))
    expect(await res.json()).toMatchObject({ authorization_servers: ["https://example.supabase.co/auth/v1"], resource: "https://example.supabase.co/functions/v1/mcp" })
  })

  it("initialises, lists tools and ignores notifications", async () => {
    const { rpc } = setup()
    const init = await rpc("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "test", version: "1" } })
    expect(init.result.protocolVersion).toBe("2025-06-18")
    expect(init.result.capabilities.tools).toBeDefined()
    const list = await rpc("tools/list")
    const names = list.result.tools.map((t: { name: string }) => t.name)
    expect(names).toContain("record_used")
    const del = list.result.tools.find((t: { name: string }) => t.name === "delete_item")
    expect(del.annotations.destructiveHint).toBe(true)
    expect(del.inputSchema.required).toContain("confirmed")
  })
})

describe("reading", () => {
  it("finds an item by another spelling", async () => {
    const { call } = setup()
    const r = await call("search_pantry", { query: "egg" })
    expect(r.text).toContain("Eggs [id: eggs]")
    expect(r.text).toContain("LOW")
  })

  it("lists the shopping list in a store's aisle order", async () => {
    const { call } = setup()
    const r = await call("get_shopping_list", { store: "tesco" })
    expect(r.text).toContain("Aisle 1 · Fruit & veg")
    expect(r.text).toContain("2 eggs [id: eggs] · Staple, have 4, keep 6")
  })

  it("says what a recipe is short of", async () => {
    const { call } = setup()
    const r = await call("find_recipes", {})
    expect(r.text).toContain("Shakshuka")
    expect(r.text).toContain("short of")
  })

  it("is unsure about onion when there are red and brown", async () => {
    const { call } = setup()
    const r = await call("match_ingredients", { lines: ["1 onion, chopped", "400 g tin chopped tomatoes", "2 tbsp sumac"] })
    const [onion, tomatoes, sumac] = r.text.split("\n")
    expect(onion).toContain("unsure")
    expect(onion).toContain("red-onions")
    expect(onion).toContain("brown-onions")
    expect(tomatoes).toContain("clear match → Chopped tomatoes")
    expect(sumac).toContain("nothing similar")
  })
})

describe("adding, no asking", () => {
  it("records used eggs and logs it as Claude", async () => {
    const { call, mem } = setup()
    const r = await call("record_used", { item: "eggs", amount: 2 })
    expect(r.isError).toBe(false)
    expect(mem.state.items.eggs.inStock).toBe(2)
    expect(mem.history[0]).toMatchObject({ who: "claude", title: "Used 2 eggs", item_ids: ["eggs"] })
    // The undo snapshot is the item as it was, in the pantry app's shape.
    expect((mem.history[0].undo as { items: Record<string, { inStock: number }> }).items.eggs.inStock).toBe(4)
  })

  it("the last of the rice: all packs gone, open count follows", async () => {
    const { call, mem } = setup()
    await call("record_used", { item: "rice", all: true })
    expect(mem.state.items.rice).toMatchObject({ inStock: 0, open: 0 })
    expect(mem.history[0].title).toBe("Used all the rice")
  })

  it("won't open a pack when every pack is open", async () => {
    const { call } = setup()
    const r = await call("record_used", { item: "plain-flour", opened_pack: true })
    expect(r.isError).toBe(true)
  })

  it("asks which onion rather than guessing", async () => {
    const { call, mem } = setup()
    const r = await call("record_used", { item: "onion" })
    expect(r.isError).toBe(true)
    expect(r.text).toContain("red-onions")
    expect(mem.history).toHaveLength(0)
  })

  it("adds stock and ticks off the list", async () => {
    const { call, mem } = setup()
    await call("add_to_shopping_list", { entries: [{ item: "red-onions", qty: 2 }] })
    expect(needOf(mem.state.items["red-onions"])).toBe(2)
    expect(mem.state.items["red-onions"].entries?.[0].source).toEqual({ kind: "claude" })
    await call("add_stock", { item: "red-onions", amount: 2, use_by: ["2026-11-20"] })
    expect(mem.state.items["red-onions"]).toMatchObject({ inStock: 4 })
    expect(needOf(mem.state.items["red-onions"])).toBe(0)
  })

  it("adds a one-off", async () => {
    const { call, mem } = setup()
    await call("add_to_shopping_list", { entries: [{ item: "birthday candles", one_off: true }] })
    const oneOff = Object.values(mem.state.items).find((i) => i.oneOff)
    expect(oneOff).toMatchObject({ name: "Birthday candles", entries: [{ qty: 1 }] })
  })

  it("adds items, skipping ones that exist and refusing made-up categories", async () => {
    const { call, mem } = setup()
    const r = await call("add_items", { items: [{ name: "Sumac", type: "bulk", unit: "jar", category: "Baking" }, { name: "eggs", type: "counted" }] })
    expect(mem.state.items.sumac).toMatchObject({ name: "Sumac", type: "bulk", target: 0, categoryId: "baking", unit: ["jar", "jars"] })
    expect(r.text).toContain("Already in the pantry, not added: Eggs")
    const bad = await call("add_items", { items: [{ name: "Za'atar", type: "bulk", category: "Spices" }] })
    expect(bad.isError).toBe(true)
  })

  it("saves a recipe, linking matches and leaving the rest unlinked", async () => {
    const { call, mem } = setup()
    const r = await call("save_recipe", {
      name: "Sumac onions",
      serves: 2,
      method: ["Slice", "Toss with sumac"],
      ingredients: [
        { text: "2 red onions", item: "red-onions", need: 2 },
        { text: "1 tbsp sumac", partial: true },
        { text: "Water" },
      ],
    })
    expect(r.isError).toBe(false)
    const saved = mem.state.recipes.find((x) => x.id === "sumac-onions")!
    expect(saved).toMatchObject({ addedBy: "claude", serves: 2 })
    expect(saved.ingredients.map((g) => g.itemId)).toEqual(["red-onions", "", ""])
    // Nothing similar: no pantry item is made.
    expect(mem.state.items.sumac).toBeUndefined()
    expect(mem.history[0]).toMatchObject({ title: "Saved Sumac onions", recipe_id: "sumac-onions" })
    expect(r.text).toContain("Not linked to the pantry (2): 1 tbsp sumac; Water")
  })

  it("want to cook puts what's short on the list, marked with the recipe", async () => {
    const { call, mem } = setup()
    await call("record_used", { item: "chopped-tomatoes", amount: 2 })
    await call("want_to_cook", { recipe: "shakshuka" })
    expect(mem.state.recipes[0].wantToCook).toBe(true)
    // Tomatoes are a Staple now out, so already on the list; eggs (4 needed, 4 had) are fine.
    expect(mem.state.items["chopped-tomatoes"].entries ?? []).toHaveLength(0)
    expect(mem.history[0].title).toBe("Want to cook Shakshuka")
  })

  it("cooked takes counted ingredients off stock", async () => {
    const { call, mem } = setup()
    const r = await call("cooked_recipe", { recipe: "Shakshuka" })
    expect(r.isError).toBe(false)
    expect(mem.state.items.eggs.inStock).toBe(0)
    expect(mem.state.items["red-onions"].inStock).toBe(1)
    expect(mem.state.recipes[0].lastCooked).toBe(NOW.toISOString())
  })
})

describe("edits and deletes need asking", () => {
  it("refuses to change an item without confirmed", async () => {
    const { call, mem } = setup()
    const r = await call("update_item", { item: "eggs", changes: { minimum: 12 } })
    expect(r.isError).toBe(true)
    expect(r.text).toContain("ask")
    expect(mem.state.items.eggs.target).toBe(6)
  })

  it("changes an item once confirmed", async () => {
    const { call, mem } = setup()
    await call("update_item", { item: "eggs", changes: { minimum: 12 }, confirmed: true })
    expect(mem.state.items.eggs.target).toBe(12)
    expect(mem.history[0]).toMatchObject({ title: "Changed Eggs", detail: "Minimum 6 → 12" })
  })

  it("marks an item as not expiring and drops its dates", async () => {
    const { call, mem } = setup()
    await call("update_item", { item: "eggs", changes: { use_by: ["2026-11-20"] }, confirmed: true })
    await call("update_item", { item: "eggs", changes: { no_expiry: true }, confirmed: true })
    expect(mem.state.items.eggs.noExpiry).toBe(true)
    expect(mem.state.items.eggs.useBy ?? []).toEqual([])
    const listed = await call("search_pantry", { query: "eggs" })
    expect(listed.text).toContain("doesn't expire")
  })

  it("changes one unit's date and leaves the others", async () => {
    const { call, mem } = setup()
    await call("update_item", { item: "eggs", changes: { use_by: ["2026-11-20", "2026-11-28"] }, confirmed: true })
    const listed = await call("search_pantry", { query: "eggs" })
    expect(listed.text).toContain("use-by dates: 1) 2026-11-20")
    expect(listed.text).toContain("3) undated")
    await call("update_item", { item: "eggs", changes: { use_by_one: { position: 3, date: "2026-11-18" } }, confirmed: true })
    expect(mem.state.items.eggs.useBy?.slice(0, 3)).toEqual(["2026-11-18", "2026-11-20", "2026-11-28"])
    expect(mem.history[0].detail).toBe("Use-by undated → 2026-11-18")
    const bad = await call("update_item", { item: "eggs", changes: { use_by_one: { position: 9, date: "2026-11-18" } }, confirmed: true })
    expect(bad.isError).toBe(true)
  })

  it("sets a bulk item's pack size and opened dates", async () => {
    const { call, mem } = setup()
    await call("update_item", { item: "rice", changes: { pack_size: { amount: 1000, measure: "g" }, opened_at: ["2026-11-10"] }, confirmed: true })
    expect(mem.state.items.rice).toMatchObject({ packSize: { amount: 1000, measure: "g" }, openedAt: ["2026-11-10"] })
    const listed = await call("search_pantry", { query: "rice" })
    expect(listed.text).toContain("pack size 1000 g")
    expect(listed.text).toContain("opened 2026-11-10")
    // One pack is open, so two opened dates is one too many.
    expect((await call("update_item", { item: "rice", changes: { opened_at: ["2026-11-10", "2026-11-11"] }, confirmed: true })).isError).toBe(true)
    // Counted items don't have packs.
    expect((await call("update_item", { item: "eggs", changes: { pack_size: { amount: 60, measure: "g" } }, confirmed: true })).isError).toBe(true)
  })

  it("clears properties with null, and leaves out ones it isn't given", async () => {
    const { call, mem } = setup()
    await call("update_item", { item: "chopped-tomatoes", changes: { brand: "Mutti", location: "cupboard", price_pence: 120 }, confirmed: true })
    await call("update_item", { item: "chopped-tomatoes", changes: { location: null, category: null, unit: null, price_pence: null }, confirmed: true })
    const t = mem.state.items["chopped-tomatoes"]
    expect(t.location).toBeUndefined()
    expect(t.categoryId).toBe("")
    expect(t.unit).toBeUndefined()
    expect(t.price).toBeUndefined()
    expect(t.brand).toBe("Mutti")
  })

  it("deletes an item once confirmed, and the recipe loses the link", async () => {
    const { call, mem } = setup()
    const no = await call("delete_item", { item: "eggs" })
    expect(no.isError).toBe(true)
    expect(no.text).toContain("Shakshuka")
    await call("delete_item", { item: "eggs", confirmed: true })
    expect(mem.state.items.eggs).toBeUndefined()
    expect(mem.state.recipes[0].ingredients[0].itemId).toBe("")
    expect((mem.history[0].undo as { recipes: Record<string, unknown> }).recipes.shakshuka).toBeTruthy()
  })

  it("taking a Staple off the list explains why it stays", async () => {
    const { call } = setup()
    const r = await call("change_shopping_list", { item: "eggs", qty: 0, confirmed: true })
    expect(r.text).toContain("Staple below its minimum")
  })
})

describe("stores and aisle numbers", () => {
  it("adds a store without asking, numbering categories by name", async () => {
    const { call, mem } = setup()
    const r = await call("add_store", { name: "Lidl", aisles: { "Tins & jars": 3, baking: 5 } })
    expect(r.isError).toBe(false)
    expect(mem.state.stores.find((s) => s.id === "lidl")?.aisles).toEqual({ "tins-and-jars": 3, baking: 5 })
    expect(mem.history[0]).toMatchObject({ who: "claude", undo: null })
  })

  it("refuses to change a store without confirmed", async () => {
    const { call, mem } = setup()
    const r = await call("update_store", { store: "tesco", changes: { aisles: { "Tins & jars": 9 } } })
    expect(r.isError).toBe(true)
    expect(mem.state.stores[0].aisles["tins-and-jars"]).toBe(6)
  })

  it("changes only the aisles it is given, and null clears one", async () => {
    const { call, mem } = setup()
    const r = await call("update_store", { store: "Tesco Express", changes: { aisles: { "Tins & jars": 9, "Fruit & veg": null } }, confirmed: true })
    expect(r.isError).toBe(false)
    expect(mem.state.stores[0].aisles).toEqual({ "tins-and-jars": 9, "grains-and-pulses": 5 })
    expect(r.text).toContain("Tins & jars 6 → 9")
  })

  it("rejects an unknown category and a bad number", async () => {
    const { call, mem } = setup()
    expect((await call("update_store", { store: "tesco", changes: { aisles: { Cheese: 2 } }, confirmed: true })).isError).toBe(true)
    expect((await call("update_store", { store: "tesco", changes: { aisles: { Baking: 0 } }, confirmed: true })).isError).toBe(true)
    expect(mem.state.stores[0].aisles.baking).toBeUndefined()
  })

  it("deletes a store only once confirmed", async () => {
    const { call, mem } = setup()
    expect((await call("delete_store", { store: "tesco" })).isError).toBe(true)
    expect(mem.state.stores).toHaveLength(1)
    await call("delete_store", { store: "tesco", confirmed: true })
    expect(mem.state.stores).toHaveLength(0)
  })
})

import { describe, expect, it } from "vitest"
import { demoState } from "../src/data/demo"
import type { PhoneState } from "../src/data/state"
import { chooseStore, clearShop, skip, skipRows, unskipAll } from "../src/logic/actions"
import { filtersOn, NO_FILTER, refreshShop, rowsOf, shownRows } from "../src/logic/list"

const start = (): PhoneState => {
  const s = demoState()
  return { ...s, shop: refreshShop(null, s.items) }
}
const other = (s: PhoneState) => s.stores.find((x) => x.id !== s.storeId)!.id

describe("Only items for this store", () => {
  it("shows only what's set to this store: another store's and any store's items are hidden", () => {
    const s = start()
    const eggs = { ...s.items.eggs, where: [other(s)] }
    const rice = { ...s.items.rice, where: [s.storeId] }
    const t = { ...s, items: { ...s.items, eggs, rice }, filter: { ...NO_FILTER, thisStore: true } }
    const ids = shownRows(t).map((r) => r.id)
    expect(ids).not.toContain("eggs")
    expect(ids).toContain("rice")
    // An item for any store (no store chosen) is hidden too (Isaac's change, 26 Nov 2026).
    expect(ids).not.toContain(rowsOf(t).find((r) => r.item.where.length === 0)!.id)
    expect(ids).toEqual(["rice"])
    expect(filtersOn(t.filter)).toBe(1)
    // Off, everything shows.
    expect(shownRows({ ...t, filter: undefined }).map((r) => r.id)).toContain("eggs")
  })
})

describe("Skip all", () => {
  it("skips every row given, and undoing brings them all back", () => {
    const s = start()
    const t = skipRows(s, ["eggs", "rice"])
    expect(shownRows(t).map((r) => r.id)).not.toEqual(expect.arrayContaining(["eggs"]))
    expect(rowsOf(t).filter((r) => r.skipped).map((r) => r.id).sort()).toEqual(["eggs", "rice"])
    expect(rowsOf(skipRows(t, ["eggs", "rice"], false)).some((r) => r.skipped)).toBe(false)
  })
})

describe("Skip this shop", () => {
  it("takes it off the list without touching the pantry", () => {
    const s = start()
    const t = skip(s, "eggs")
    expect(shownRows(t).map((r) => r.id)).not.toContain("eggs")
    expect(rowsOf(t).find((r) => r.id === "eggs")!.skipped).toBe(true)
    expect(t.items).toBe(s.items)
  })

  it("stays skipped when the item changes elsewhere", () => {
    const t = skip(start(), "eggs")
    const items = { ...t.items, eggs: { ...t.items.eggs, target: t.items.eggs.target + 2 } }
    const shop = refreshShop(t.shop, items)
    expect(shop.rows.eggs.skipped).toBe(true)
    expect(shop.rows.eggs.need).toBeGreaterThan(t.shop!.rows.eggs.need)
  })

  it("comes back when you change store, bring it back, or start a new list", () => {
    const t = skip(start(), "eggs")
    expect(shownRows(chooseStore(t, other(t))).map((r) => r.id)).toContain("eggs")
    // Choosing the store you're already in keeps it skipped.
    expect(shownRows(chooseStore(t, t.storeId)).map((r) => r.id)).not.toContain("eggs")
    expect(shownRows({ ...t, shop: unskipAll(t.shop!) }).map((r) => r.id)).toContain("eggs")
    expect(shownRows(clearShop(t)).map((r) => r.id)).toContain("eggs")
  })

  it("can be undone", () => {
    const t = skip(skip(start(), "eggs"), "eggs", false)
    expect(shownRows(t).map((r) => r.id)).toContain("eggs")
  })
})

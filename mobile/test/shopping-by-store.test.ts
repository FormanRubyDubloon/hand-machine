import { describe, expect, it } from "vitest"
import { demoState } from "../src/data/demo"
import type { PhoneState } from "../src/data/state"
import { chooseStore, clearShop, skip, unskipAll } from "../src/logic/actions"
import { filtersOn, NO_FILTER, refreshShop, rowsOf, shownRows } from "../src/logic/list"

const start = (): PhoneState => {
  const s = demoState()
  return { ...s, shop: refreshShop(null, s.items) }
}
const other = (s: PhoneState) => s.stores.find((x) => x.id !== s.storeId)!.id

describe("Only items for this store", () => {
  it("hides what's bought at another store and keeps what's for every store", () => {
    const s = start()
    const eggs = { ...s.items.eggs, where: [other(s)] }
    const rice = { ...s.items.rice, where: [s.storeId] }
    const t = { ...s, items: { ...s.items, eggs, rice }, filter: { ...NO_FILTER, thisStore: true } }
    const ids = shownRows(t).map((r) => r.id)
    expect(ids).not.toContain("eggs")
    expect(ids).toContain("rice")
    // An item with no store chosen is for every store.
    expect(ids).toContain(rowsOf(t).find((r) => r.item.where.length === 0)!.id)
    expect(filtersOn(t.filter)).toBe(1)
    // Off, everything shows.
    expect(shownRows({ ...t, filter: undefined }).map((r) => r.id)).toContain("eggs")
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

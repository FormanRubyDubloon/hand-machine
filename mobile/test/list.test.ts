import { describe, expect, it } from "vitest"
import { demoState } from "../src/data/demo"
import { clearShop, removeFromList, restoreTicks, tickAll, tickOne, untick, addNew, setToGet } from "../src/logic/actions"
import { aislesOf, refreshShop, rowsOf, shopAisles, tickedText, type Row } from "../src/logic/list"
import type { PhoneState } from "../src/data/state"

const start = (): PhoneState => {
  const s = demoState()
  return { ...s, shop: refreshShop(null, s.items) }
}

describe("the list", () => {
  it("has Staples below their minimum, with how many to buy", () => {
    const rows = rowsOf(start())
    const eggs = rows.find((r) => r.id === "eggs")!
    expect(eggs.need).toBe(2)
    // One open bag of rice with a minimum of 2 means buying 2 (only full packs count).
    expect(rows.find((r) => r.id === "rice")!.need).toBe(2)
    // Spinach isn't a Staple and isn't on the list.
    expect(rows.find((r) => r.id === "spinach")).toBeUndefined()
  })

  it("walks the store in aisle order, with shared numbers together and no-number last", () => {
    const s = start()
    const aisles = shopAisles(s)
    expect(aisles[0].number).toBe(1)
    const nine = aisles.find((a) => a.number === 9)!
    expect(nine.categories.map((c) => c.name)).toEqual(["Tins & jars", "Pasta, rice & grains"])
    expect(aisles[aisles.length - 1].number).toBeNull()
    expect(aisles[aisles.length - 1].rows.map((r) => r.id)).toContain("candles")
  })

  it("ticking one adds to stock straight away, and the row stays on the list", () => {
    let s = tickOne(start(), "eggs")
    expect(s.items.eggs.inStock).toBe(5)
    const row = rowsOf(s).find((r) => r.id === "eggs")!
    expect([row.got, row.left, row.note]).toEqual([1, 1, "Got 1 of 2 · Below your minimum of 6"])
    s = tickOne(s, "eggs")
    expect(rowsOf(s).find((r) => r.id === "eggs")!).toMatchObject({ done: true, note: "Got 2 eggs" })
  })

  it("bulk: ticking adds a full pack", () => {
    const s = tickAll(start(), "rice")
    expect([s.items.rice.inStock, s.items.rice.open]).toEqual([3, 1])
  })

  it("un-ticking takes the stock back and restores the list entry and New mark", () => {
    let s = tickAll(start(), "parsley")
    expect(s.items.parsley.inStock).toBe(1)
    expect(s.items.parsley.review).toBeUndefined()
    expect(s.items.parsley.entries ?? []).toEqual([])
    s = untick(s, "parsley")
    expect(s.items.parsley.inStock).toBe(0)
    expect(s.items.parsley.review).toBe(true)
    expect(s.items.parsley.entries?.[0].source).toEqual({ kind: "recipe", recipe: "Sardine linguine" })
  })

  it("the got-all Undo puts back what was ticked before", () => {
    let s = tickOne(start(), "eggs")
    s = tickAll(s, "eggs")
    s = restoreTicks(s, "eggs", 1)
    expect(s.items.eggs.inStock).toBe(5)
    expect(rowsOf(s).find((r) => r.id === "eggs")!.got).toBe(1)
  })

  it("something new becomes a New pantry item on the list", () => {
    const { state, id } = addNew(start(), "feta", "dairy-and-eggs")
    expect(state.items[id]).toMatchObject({ name: "Feta", target: 0, inStock: 0, review: true, location: "fridge" })
    expect(rowsOf(state).find((r) => r.id === id)?.need).toBe(1)
  })

  it("starting a new list drops ticked rows and tidies one-offs", () => {
    let s = tickAll(start(), "candles")
    s = tickAll(s, "eggs")
    s = clearShop(s)
    expect(s.items.candles).toBeUndefined()
    expect(rowsOf(s).find((r) => r.id === "eggs")).toBeUndefined()
  })

  it("removing a Staple lowers its minimum so it doesn't come straight back", () => {
    const s = removeFromList(start(), "eggs")
    expect(s.items.eggs.target).toBe(4)
    expect(rowsOf({ ...s, shop: refreshShop(s.shop, s.items) }).find((r) => r.id === "eggs")).toBeUndefined()
  })

  it("To get changes the amount", () => {
    const s = setToGet(start(), "sardines", 3)
    expect(rowsOf(s).find((r) => r.id === "sardines")!.need).toBe(3)
  })

  it("a store with no numbers puts everything under No aisle number", () => {
    const s = start()
    const aisles = aislesOf({ id: "x", name: "Corner shop", aisles: {} }, s.categories)
    expect(aisles).toHaveLength(1)
    expect(aisles[0].number).toBeNull()
  })
})

describe("the toast after a tick", () => {
  const row = (over: Partial<Row["item"]>, need: number, got = 0) =>
    ({ id: "x", item: { id: "x", name: "Eggs", unit: null, ...over }, need, got, left: need - got, done: got >= need }) as unknown as Row

  it("counts what this run of taps got, and what's left", () => {
    expect(tickedText(row({}, 6), 1)).toBe("Eggs: got 1, 5 to get.")
    expect(tickedText(row({}, 6, 1), 3)).toBe("Eggs: got 2, 3 to get.")
  })
  it("uses the unit when the item has one", () => {
    expect(tickedText(row({ name: "Flour", unit: ["bag", "bags"] }, 3), 1)).toMatch(/^Flour: got 1 bag, 2 bags to get\.$/)
  })
  it("says got all on the last one", () => {
    expect(tickedText(row({}, 6, 5), 6)).toBe("Got all 6 eggs.")
    expect(tickedText(row({}, 1), 1)).toBe("Got eggs.")
  })
})

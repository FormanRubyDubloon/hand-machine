import { describe, expect, it } from "vitest"
import { demoState } from "../src/data/demo"
import { clearShop, removeFromList, removeQuestion, restoreTicks, skip, tickAll, tickOne, untick, addNew, setToGet } from "../src/logic/actions"
import { filtersOn, leftOf, matchesFilter, NO_FILTER, refreshShop, rowsOf, shopGroups, shownRows, tickedText, whereNext, type Row } from "../src/logic/list"
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

  it("walks the store: No aisle first, then the numbers, then named places", () => {
    const s = start()
    const aisles = shopGroups(s)
    expect(aisles[0]).toMatchObject({ title: "No aisle", aisle: null })
    expect(aisles[0].rows.map((r) => r.id)).toEqual(expect.arrayContaining(["candles", "sardines"]))
    const titles = aisles.map((a) => a.title)
    expect(titles.indexOf("Aisle 1")).toBeLessThan(titles.indexOf("Aisle 9"))
    expect(titles[titles.length - 1]).toBe("Freezer")
    // Items sharing a number are one aisle, whatever their tags.
    expect(aisles.find((a) => a.title === "Aisle 9")!.rows.map((r) => r.id)).toEqual(expect.arrayContaining(["linguine", "rice"]))
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

  it("a store with no aisle numbers lists everything A to Z under one heading", () => {
    const s = start()
    const t = { ...s, stores: s.stores.map((x) => (x.id === s.storeId ? { ...x, noAisleNumbers: true } : x)) }
    const aisles = shopGroups(t)
    expect(aisles.map((a) => a.title)).toEqual(["A to Z"])
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

describe("the aisle counts", () => {
  it("drop with every tap, not only when a row is done", () => {
    const s = start()
    const aisle = (st: PhoneState) => shopGroups(st).find((a) => a.rows.some((r) => r.id === "sardines"))!
    const before = aisle(s)
    const after = aisle(tickOne(s, "sardines"))
    expect(after.left).toBe(before.left - 1)
    expect(after.total).toBe(before.total)
    expect(leftOf(rowsOf(tickOne(s, "sardines")))).toBe(leftOf(rowsOf(s)) - 1)
  })
})

describe("asking before Remove from list", () => {
  it("says a Staple's minimum will drop", () => {
    expect(removeQuestion(start(), "sardines")).toBe("Take sardines off the list? It's a Staple, so its minimum drops from 2 to 0, or it would come straight back.")
  })
  it("says something never bought goes altogether", () => {
    const { state, id } = addNew(start(), "Birthday candles", "household")
    expect(removeQuestion(state, id)).toBe("Take birthday candles off the list? It isn't in your pantry, so it goes altogether.")
  })
})

describe("the list filters", () => {
  it("groups rows as the pantry app does, and keeps a ticked row in its group and stock", () => {
    const s = start()
    const eggs = rowsOf(s).find((r) => r.id === "eggs")!
    expect(eggs.group).toBe("staples")
    // Ticking both eggs brings them to the minimum, but the row still counts as a Staple that was low or out.
    const after = rowsOf(tickAll(s, "eggs")).find((r) => r.id === "eggs")!
    expect([after.group, after.status]).toEqual([eggs.group, eggs.status])
  })

  it("shows only what matches, aisle by aisle, and clears when a new list starts", () => {
    const s: PhoneState = { ...start(), filter: { show: "staples", stock: "all" } }
    expect(shownRows(s).every((r) => r.group === "staples")).toBe(true)
    expect(shopGroups(s).flatMap((a) => a.rows).every((r) => r.group === "staples")).toBe(true)
    expect(matchesFilter(rowsOf(s)[0], NO_FILTER)).toBe(true)
    expect(filtersOn(s.filter)).toBe(1)
    expect(clearShop(s).filter).toBeUndefined()
  })
})

describe("shop done: where next", () => {
  it("lists the other stores by how many of the skipped things each sells, most first", () => {
    let s = start()
    s = { ...s, storeId: "sainsburys", stores: [...s.stores, { id: "corner", name: "Corner shop", aisles: {} }] }
    s = { ...s, items: { ...s.items, eggs: { ...s.items.eggs, where: ["tesco"] }, rice: { ...s.items.rice, where: ["corner"] } } }
    for (const id of ["eggs", "rice", "sardines"]) s = skip(s, id)
    const next = whereNext(s)
    // Sardines has no store, so every store sells it.
    expect(next.map((n) => [n.store.id, n.rows.map((r) => r.id).sort()])).toEqual([
      ["corner", ["rice", "sardines"]],
      ["tesco", ["eggs", "sardines"]],
    ])
    expect(next.find((n) => n.store.id === "tesco")!.names).toMatch(/^Eggs × 2, /)
  })

  it("leaves out the store you're in and stores that sell none of it", () => {
    let s = { ...start(), storeId: "sainsburys" }
    expect(whereNext(s)).toEqual([])
    s = skip(s, "eggs")
    expect(whereNext(s).map((n) => n.store.id)).toEqual(["tesco"])
  })
})

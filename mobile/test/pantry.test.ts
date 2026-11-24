import { describe, expect, it } from "vitest"
import type { Item } from "../../prototypes/pantry-app/src/model"
import { emptyState } from "../src/data/state"
import { setStore } from "../src/logic/actions"
import { defaultView, inStockOnly, locationCounts, pantryItems, viewOf } from "../src/logic/pantry"

const item = (id: string, over: Partial<Item> = {}): Item => ({ id, name: id, type: "counted", target: 0, inStock: 1, categoryId: "", where: [], location: "cupboard", ...over })

const items = {
  beans: item("Beans", { location: "cupboard", inStock: 3, addedAt: "2026-11-01" }),
  milk: item("Milk", { location: "fridge", inStock: 0, target: 1 }),
  apples: item("Apples", { location: "counter", inStock: 2, addedAt: "2026-11-20" }),
  peas: item("Peas", { location: "freezer", inStock: 0 }),
  oneoff: item("Balloons", { oneOff: true }),
}

describe("browsing the pantry on the phone", () => {
  it("is in stock only until the switch is turned off", () => {
    expect(inStockOnly({})).toBe(true)
    expect(inStockOnly({ pantryAll: true })).toBe(false)
    expect(pantryItems(items, false).map((i) => i.name).sort()).toEqual(["Apples", "Beans"])
    expect(pantryItems(items, true)).toHaveLength(4)
  })

  it("leaves out locations with nothing to show", () => {
    const counts = locationCounts(pantryItems(items, false))
    expect(counts.get("fridge")).toBeUndefined()
    expect(counts.get("freezer")).toBeUndefined()
    expect(counts.get("cupboard")).toBe(1)
  })

  it("sorts and filters the all-items view", () => {
    const all = pantryItems(items, true)
    expect(viewOf(all, defaultView).map((i) => i.name)).toEqual(["Apples", "Beans", "Milk", "Peas"])
    expect(viewOf(all, { ...defaultView, sort: "added" }).map((i) => i.name).slice(0, 2)).toEqual(["Apples", "Beans"])
    expect(viewOf(all, { ...defaultView, location: "fridge" }).map((i) => i.name)).toEqual(["Milk"])
    expect(viewOf(all, { ...defaultView, show: "out" }).map((i) => i.name)).toEqual(["Milk", "Peas"])
    expect(viewOf(all, { ...defaultView, show: "staples" }).map((i) => i.name)).toEqual(["Milk"])
  })
})

describe("choosing an item's store on the phone", () => {
  it("sets one store, or none for any store", () => {
    const s = { ...emptyState(), items: { beans: item("beans") } }
    const tesco = setStore(s, "beans", "tesco")
    expect(tesco.items.beans.where).toEqual(["tesco"])
    expect(setStore(tesco, "beans", null).items.beans.where).toEqual([])
    // Choosing the store it already has changes nothing.
    expect(setStore(tesco, "beans", "tesco")).toBe(tesco)
  })
})

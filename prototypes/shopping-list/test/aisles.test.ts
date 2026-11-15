// Categories without an aisle number: a blank at one store means it isn't sold there, but a category no
// store has numbered yet (a new one, like Health Foods) shows at every store, at the end.
import { describe, expect, it } from "vitest"
import { aislesOf, soldAt, type Category, type Item, type Store } from "../src/model"

const cats: Category[] = [{ id: "veg", name: "Fruit & veg" }, { id: "milk", name: "Dairy" }, { id: "health", name: "Health Foods" }, { id: "baking", name: "Baking" }]
const supermarket: Store = { id: "super", name: "Supermarket", aisles: { veg: 1, milk: 2, health: null } }
const greengrocer: Store = { id: "green", name: "Greengrocer", aisles: { veg: 1 } }
const bare: Store = { id: "bare", name: "New shop", aisles: {} }
const stores = [supermarket, greengrocer, bare]
const item = (categoryId: string, where: string[] = []): Item => ({ id: categoryId, name: categoryId, target: 0, inStock: 0, type: "counted", categoryId, where })

describe("categories without an aisle number", () => {
  it("still hides a category another store numbers", () => {
    expect(soldAt(item("milk"), greengrocer, stores)).toBe(false)
  })

  it("shows a category no store numbers, at every store", () => {
    for (const s of stores) expect(soldAt(item("health"), s, stores)).toBe(true)
  })

  it("respects an item's own list of shops", () => {
    expect(soldAt(item("health", ["super"]), greengrocer, stores)).toBe(false)
  })

  it("puts unnumbered categories last, A to Z, with no number", () => {
    const aisles = aislesOf(supermarket, cats, stores)
    expect(aisles.map((a) => a.number)).toEqual([1, 2, null])
    expect(aisles.at(-1)).toMatchObject({ categoryIds: ["baking", "health"], name: "Baking · Health Foods" })
  })

  it("gives a store with no numbers just the unnumbered group", () => {
    expect(aislesOf(bare, cats, stores)).toEqual([{ number: null, categoryIds: ["baking", "health"], name: "Baking · Health Foods" }])
  })
})

// "This store has no aisle numbers": the list goes A to Z and ticked categories say what it sells.
import { describe, expect, it } from "vitest"
import { aisleNumber, aisleOrder, numberedAisles, sells, soldAt, type Category, type Item, type Store } from "../../pantry-app/src/model"
import { storeFingerprint } from "../../pantry-app/src/sync"
import { storeExtras } from "../../shared/src/rows"

const cats: Category[] = [{ id: "veg", name: "Fruit & veg" }, { id: "bakery", name: "Bread" }, { id: "meat", name: "Meat" }]
const grocer: Store = { id: "grocer", name: "Greengrocer", aisles: { veg: 3, bakery: 1, meat: null } }
const egg = (categoryId: string): Item => ({ id: "x", name: "X", type: "counted", target: 0, inStock: 0, categoryId, where: [] })

describe("a store with no aisle numbers", () => {
  const off: Store = { ...grocer, noAisleNumbers: true, sells: ["veg"] }

  it("sells only what's ticked, whatever its old numbers say", () => {
    expect(sells(off, "veg")).toBe(true)
    expect(sells(off, "bakery")).toBe(false)
  })


  it("lists A to Z and shows no numbers", () => {
    expect(aisleOrder(off, cats).map((c) => c.id)).toEqual(["bakery", "veg", "meat"])
    expect(aisleNumber(off, "veg")).toBeNull()
    expect(numberedAisles(off)).toBe(0)
  })

  it("keeps the numbers, so turning it off brings them back", () => {
    const on = { ...off, noAisleNumbers: undefined }
    expect(aisleOrder(on, cats).map((c) => c.id)).toEqual(["bakery", "veg", "meat"])
    expect(aisleNumber(on, "veg")).toBe(3)
    expect(sells(on, "bakery")).toBe(true)
  })

  it("counts as a change to sync", () => {
    expect(storeFingerprint(off)).not.toBe(storeFingerprint(grocer))
    expect(storeFingerprint(off)).not.toBe(storeFingerprint({ ...off, sells: ["veg", "meat"] }))
  })

  it("reads from a Supabase row", () => {
    expect(storeExtras({ no_aisle_numbers: true, sells: ["veg"] })).toEqual({ noAisleNumbers: true, sells: ["veg"] })
    expect(storeExtras({ no_aisle_numbers: false, sells: [] })).toEqual({})
  })
})

describe("Any store", () => {
  it("is on every store's list, even where the store has no number for its aisle", () => {
    expect(soldAt(egg("meat"), grocer)).toBe(true)
    expect(soldAt(egg("bakery"), { ...grocer, noAisleNumbers: true, sells: [] })).toBe(true)
  })

  it("a chosen store keeps it to that store", () => {
    expect(soldAt({ ...egg("veg"), where: ["butcher"] }, grocer)).toBe(false)
    expect(soldAt({ ...egg("veg"), where: ["grocer"] }, grocer)).toBe(true)
  })
})

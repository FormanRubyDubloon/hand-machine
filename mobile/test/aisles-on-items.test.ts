// Batch 4a (24 Nov 2026): aisles sit on each item, per store; tags are labels; the list can go by aisle or by tag.
import { describe, expect, it } from "vitest"
import { aisleTiles, compareAisles, storeAisles, highestAisle } from "../../prototypes/pantry-app/src/model"
import { demoState } from "../src/data/demo"
import type { PhoneState } from "../src/data/state"
import { addNew, addPlace, removePlace, removeStore, setAisleCount, setItemAisle, tickAll, tickOne, untick } from "../src/logic/actions"
import { asksForAisle, refreshShop, shopGroups, today } from "../src/logic/list"

const start = (): PhoneState => {
  const s = demoState()
  return { ...s, shop: refreshShop(null, s.items) }
}

describe("an item's aisle in a store", () => {
  it("is set at a tick-off and moves the item to that aisle", () => {
    const s = start()
    expect(shopGroups(s)[0].rows.map((r) => r.id)).toContain("sardines")
    const t = setItemAisle(s, "sardines", s.storeId, 9)
    expect(t.items.sardines.aisleAt).toEqual({ [s.storeId]: 9 })
    expect(shopGroups(t).find((a) => a.title === "Aisle 9")!.rows.map((r) => r.id)).toContain("sardines")
    // Clearing it puts it back under No aisle; setting the same again changes nothing.
    expect(setItemAisle(t, "sardines", s.storeId, null).items.sardines.aisleAt).toBeUndefined()
    expect(setItemAisle(t, "sardines", s.storeId, 9)).toBe(t)
  })

  it("is only for that store", () => {
    const s = start()
    const t = setItemAisle(s, "sardines", "tesco", 3)
    expect(t.items.sardines.aisleAt).toEqual({ tesco: 3 })
    expect(shopGroups(t)[0].rows.map((r) => r.id)).toContain("sardines")
  })

  it("can be a named place, which the store learns, walked after the numbers in its own order", () => {
    const s = start()
    const t = setItemAisle(s, "binbags", s.storeId, "Household corner")
    const store = t.stores.find((x) => x.id === s.storeId)!
    expect(store.places).toEqual(["Freezer", "Tills", "Household corner"])
    expect(compareAisles(store, 20, "Freezer")).toBeLessThan(0)
    expect(compareAisles(store, "Tills", "Household corner")).toBeLessThan(0)
    expect(compareAisles(store, null, 1)).toBeLessThan(0)
    const titles = shopGroups(t).map((a) => a.title)
    expect(titles.slice(-2)).toEqual(["Freezer", "Household corner"])
  })

  it("goes back to No aisle when its place is removed, or its store is", () => {
    const s = start()
    const t = removePlace(s, s.storeId, "freezer")
    expect(t.stores.find((x) => x.id === s.storeId)!.places).toEqual(["Tills"])
    expect(t.items.peas.aisleAt).toBeUndefined()
    const u = removeStore(s, s.storeId)
    expect(Object.values(u.items).some((i) => i.aisleAt?.[s.storeId] !== undefined)).toBe(false)
    expect(addPlace(s, s.storeId, "tills")).toBe(s)
  })

  it("is asked for only when it's missing, the store has numbers, and the setting is on", () => {
    const s = start()
    expect(asksForAisle(s, s.items.sardines)).toBe(true)
    expect(asksForAisle(s, s.items.eggs)).toBe(false)
    expect(asksForAisle({ ...s, noAislePrompt: true }, s.items.sardines)).toBe(false)
    const az = { ...s, stores: s.stores.map((x) => ({ ...x, noAisleNumbers: true })) }
    expect(asksForAisle(az, s.items.sardines)).toBe(false)
  })

  it("lists each aisle a store has used, with its items, for fixing mistakes", () => {
    const s = start()
    const store = s.stores.find((x) => x.id === s.storeId)!
    const aisles = storeAisles(store, Object.values(s.items))
    expect(aisles[0].aisle).toBe(1)
    expect(aisles[aisles.length - 1].aisle).toBe("Freezer")
    expect(highestAisle(store, Object.values(s.items))).toBe(17)
  })

  it("is asked with 20 number tiles, or the store's own number of aisles", () => {
    const s = start()
    const store = s.stores.find((x) => x.id === s.storeId)!
    const items = Object.values(s.items)
    expect(aisleTiles(store, items)).toBe(20)
    // A store that's already gone past 20 keeps going.
    expect(aisleTiles(store, [{ ...items[0], aisleAt: { [store.id]: 24 } }])).toBe(24)
    const t = setAisleCount(s, store.id, 8)
    expect(aisleTiles(t.stores.find((x) => x.id === store.id)!, items)).toBe(8)
    // Back to 20 is the default again, stored as unset.
    expect(setAisleCount(t, store.id, 20).stores.find((x) => x.id === store.id)!.aisleCount).toBeUndefined()
    expect(setAisleCount(s, store.id, 20)).toBe(s)
  })

  it("is given to something new added from an aisle", () => {
    const { state, id } = addNew(start(), "Samphire", "", 1, 1)
    expect(state.items[id].aisleAt).toEqual({ [state.storeId]: 1 })
    expect(state.items[id].categoryId).toBe("")
  })
})

describe("shopping by tag", () => {
  it("has one heading per tag, A to Z with No tag last, each following the walk", () => {
    const s: PhoneState = { ...start(), groupBy: "tag" }
    const groups = shopGroups(s)
    const titles = groups.map((g) => g.title)
    expect(titles[titles.length - 1]).toBe("No tag")
    expect([...titles.slice(0, -1)].sort((a, b) => a.localeCompare(b))).toEqual(titles.slice(0, -1))
    // Within a tag, rows follow the walk: sardines (no aisle yet) before the tins in aisle 9.
    const tins = groups.find((g) => g.title === "Tins & jars")!
    expect(tins.rows[0].id).toBe("sardines")
  })
})

describe("the bought date", () => {
  it("is today after a tick-off, and goes back when it's unticked", () => {
    const s = start()
    const before = s.items.eggs.boughtAt
    const t = tickOne(s, "eggs")
    expect(t.items.eggs.boughtAt).toBe(today())
    expect(untick(tickAll(s, "eggs"), "eggs").items.eggs.boughtAt).toBe(before)
  })
})

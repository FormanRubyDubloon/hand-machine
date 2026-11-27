// Aisle guesses from tags (27 Nov 2026): each store learns from the items you've placed there.
import { describe, expect, it } from "vitest"
import { guessAisle, guessAisles, type Item, type Store } from "../../prototypes/pantry-app/src/model"
import { emptyState, type PhoneState } from "../src/data/state"
import { acceptGuesses, guessesToCheck, guessFor, guessReason, sayNo } from "../src/logic/aisle-guesses"

const store: Store = { id: "tesco", name: "Tesco", aisles: {}, places: ["Freezer"] } as Store
const other: Store = { id: "aldi", name: "Aldi", aisles: {} } as Store
const item = (id: string, tags: string[], aisle?: number | string, extra: Partial<Item> = {}): Item =>
  ({ id, name: id[0].toUpperCase() + id.slice(1), type: "counted", inStock: 1, target: 1, categoryId: tags[0] ?? "", tagIds: tags, where: [], aisleAt: aisle === undefined ? undefined : { tesco: aisle }, ...extra }) as Item

const pantry = [
  item("beans", ["tinned"], 7),
  item("tomatoes", ["tinned", "staples"], 7),
  item("chickpeas", ["tinned"], 7),
  item("tuna", ["tinned"], 9),
  item("milk", ["dairy", "staples"], 2),
  item("butter", ["dairy"], 2),
  item("rice", ["staples"], 12),
  item("peas", ["frozen"], "Freezer"),
  item("lentils", ["tinned", "staples"]),
  item("yoghurt", ["dairy"]),
  item("salt", ["staples"]),
  item("chips", ["frozen"]),
  item("soap", []),
]
const byId = (id: string) => pantry.find((i) => i.id === id)!

describe("guessing an item's aisle from its tags", () => {
  it("follows a tag whose items mostly share an aisle", () => {
    expect(guessAisle(store, pantry, byId("lentils"))).toMatchObject({ aisle: 7, tagId: "tinned", agree: 3, of: 4 })
    expect(guessAisle(store, pantry, byId("yoghurt"))).toMatchObject({ aisle: 2, tagId: "dairy", agree: 2, of: 2 })
  })

  it("makes no guess from a tag spread across the shop", () => {
    // Staples: 7, 2, 12. No aisle has two thirds.
    expect(guessAisle(store, pantry, byId("salt"))).toBeNull()
  })

  it("needs two placed items to agree", () => {
    // Only one Frozen item is placed.
    expect(guessAisle(store, pantry, byId("chips"))).toBeNull()
    expect(guessAisle(store, [...pantry, item("ice", ["frozen"], "Freezer")], byId("chips"))).toMatchObject({ aisle: "Freezer" })
  })

  it("makes no guess for items with no tags, items already placed, or another store", () => {
    expect(guessAisle(store, pantry, byId("soap"))).toBeNull()
    expect(guessAisle(store, pantry, byId("beans"))).toBeNull()
    expect(guessAisle(other, pantry, byId("lentils"))).toBeNull()
    expect(guessAisle({ ...store, noAisleNumbers: true }, pantry, byId("lentils"))).toBeNull()
  })

  it("lists every guess for a store A to Z, leaving out one-off items", () => {
    const list = guessAisles(store, [...pantry, item("candles", ["dairy"], undefined, { oneOff: true })])
    expect(list.map((g) => g.itemId)).toEqual(["lentils", "yoghurt"])
  })
})

describe("aisle guesses on the phone", () => {
  const phone = (): PhoneState => ({ ...emptyState(), items: Object.fromEntries(pantry.map((i) => [i.id, i])), stores: [store, other], storeId: "tesco" })

  it("shows guesses for the store you're in until you say no", () => {
    const s = phone()
    const [lentils] = guessesToCheck(s)
    expect(lentils.itemId).toBe("lentils")
    const t = sayNo(s, lentils)
    expect(guessesToCheck(t).map((g) => g.itemId)).toEqual(["yoghurt"])
    expect(guessFor(t, store, byId("lentils"))).toBeNull()
  })

  it("puts accepted guesses on their items", () => {
    const s = phone()
    const t = acceptGuesses(s, guessesToCheck(s))
    expect(t.items.lentils.aisleAt).toEqual({ tesco: 7 })
    expect(t.items.yoghurt.aisleAt).toEqual({ tesco: 2 })
    expect(guessesToCheck(t)).toEqual([])
  })

  it("says why", () => {
    const [lentils, yoghurt] = guessesToCheck(phone())
    expect(guessReason(lentils, "Tinned")).toBe("3 of your 4 Tinned items are in aisle 7")
    expect(guessReason(yoghurt, "Dairy")).toBe("Both your Dairy items are in aisle 2")
    expect(guessReason({ ...yoghurt, aisle: "Freezer", agree: 3, of: 3 }, "Frozen")).toBe("All 3 of your Frozen items are at Freezer")
  })
})

import { describe, expect, it } from "vitest"
import type { Store } from "../../prototypes/pantry-app/src/model"
import { aislesOf, numberOf } from "../src/logic/list"
import { addAisle } from "../src/logic/actions"
import { emptyState } from "../src/data/state"

const off: Store = { id: "grocer", name: "Greengrocer", aisles: { veg: 3 }, noAisleNumbers: true, sells: ["veg"] }

describe("a store with no aisle numbers, on the phone", () => {
  it("puts everything under No aisle number, A to Z", () => {
    expect(numberOf(off, "veg")).toBeNull()
    expect(aislesOf(off, [{ id: "veg", name: "Veg" }, { id: "bread", name: "Bread" }]).map((a) => a.key)).toEqual(["none"])
  })

  it("ticks an aisle added there instead of numbering it", () => {
    const made = addAisle({ ...emptyState(), stores: [off] }, "grocer", "Mushrooms", 4)!
    const store = made.state.stores[0]
    expect(store.aisles[made.id]).toBeNull()
    expect(store.sells).toContain(made.id)
  })
})

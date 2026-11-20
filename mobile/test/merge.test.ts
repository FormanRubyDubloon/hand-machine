import { describe, expect, it } from "vitest"
import { mergeItems } from "../src/logic/merge"
import type { Item } from "../src/data/state"

const egg = (over: Partial<Item> = {}): Item => ({ id: "eggs", name: "Eggs", type: "counted", target: 6, inStock: 4, categoryId: "dairy", where: [], unit: ["egg", "eggs"], ...over })

describe("mergeItems", () => {
  it("takes Supabase's copy as it is before the first sync", () => {
    const m = mergeItems({}, null, { eggs: egg() })
    expect(Object.keys(m.items)).toEqual(["eggs"])
    expect(m.push).toEqual([])
  })

  it("sends a change made only on the phone", () => {
    const m = mergeItems({ eggs: egg({ inStock: 6 }) }, { eggs: egg() }, { eggs: egg() })
    expect(m.push.map((i) => i.inStock)).toEqual([6])
    expect(m.conflicts).toEqual([])
  })

  it("takes a change made only elsewhere", () => {
    const m = mergeItems({ eggs: egg() }, { eggs: egg() }, { eggs: egg({ notes: "Free range" }) })
    expect(m.items.eggs.notes).toBe("Free range")
    expect(m.push).toEqual([])
    expect(m.pulled).toBe(1)
  })

  it("merges changes to different fields from both sides", () => {
    const m = mergeItems({ eggs: egg({ inStock: 6 }) }, { eggs: egg() }, { eggs: egg({ notes: "Free range" }) })
    expect(m.conflicts).toEqual([])
    expect(m.items.eggs.inStock).toBe(6)
    expect(m.items.eggs.notes).toBe("Free range")
    expect(m.push).toHaveLength(1)
  })

  it("puts a clash in the same field to you, keeping the phone's version and not sending it", () => {
    const m = mergeItems({ eggs: egg({ inStock: 6 }) }, { eggs: egg() }, { eggs: egg({ inStock: 2 }) })
    expect(m.conflicts.map((c) => [c.itemId, c.fields])).toEqual([["eggs", ["inStock"]]])
    expect(m.items.eggs.inStock).toBe(6)
    expect(m.push).toEqual([])
  })

  it("deletes here what was deleted elsewhere, and there what was deleted here", () => {
    expect(mergeItems({ eggs: egg() }, { eggs: egg() }, {}).items.eggs).toBeUndefined()
    expect(mergeItems({}, { eggs: egg() }, { eggs: egg() }).remove).toEqual(["eggs"])
  })

  it("keeps a shop: an item changed here survives being deleted elsewhere", () => {
    const m = mergeItems({ eggs: egg({ inStock: 6 }) }, { eggs: egg() }, {})
    expect(m.items.eggs.inStock).toBe(6)
    expect(m.push).toHaveLength(1)
  })

  it("ignores when it was edited", () => {
    const m = mergeItems({ eggs: egg({ editedAt: "2026-11-20T10:00:00Z" }) }, { eggs: egg() }, { eggs: egg({ editedAt: "2026-11-20T11:00:00Z" }) })
    expect(m.push).toEqual([])
    expect(m.conflicts).toEqual([])
  })
})

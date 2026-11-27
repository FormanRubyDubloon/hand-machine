// An open pack marked running low (27 Nov 2026): the shared rules, the row mapping and Claude's record_used.
import { describe, expect, it } from "vitest"
import { fullOf, listBox, listRows, needOf, normalise, stockOf, withStock, type Item } from "../../pantry-app/src/model"
import { toItem, toRow, type Row } from "../../shared/src/rows"

const flour = (over: Partial<Item> = {}): Item =>
  normalise({ id: "flour", name: "Flour", type: "bulk", unit: ["bag", "bags"], target: 0, inStock: 1, open: 1, categoryId: "baking", where: [], ...over })

describe("an open pack running low", () => {
  it("puts one on the list when it's the last pack, Staple or not", () => {
    expect(needOf(flour())).toBe(0)
    const low = flour({ openLow: true })
    expect(needOf(low)).toBe(1)
    expect(stockOf(low)).toBe("low")
    expect(listRows({ flour: low })[0]).toMatchObject({ qty: 1, group: "staples", reasons: [{ kind: "low" }] })
    expect(listBox(low)).toMatchObject({ on: true, head: "1 on the shopping list" })
  })

  it("needs nothing while a full pack follows it", () => {
    const low = flour({ openLow: true, inStock: 2 })
    expect(needOf(low)).toBe(0)
    expect(stockOf(low)).toBeNull()
    expect(low.openLow).toBe(true)
  })

  it("never counts towards the minimum, even when open packs do", () => {
    const counted = flour({ target: 1, openCounts: true })
    expect([fullOf(counted), needOf(counted)]).toEqual([1, 0])
    const low = { ...counted, openLow: true }
    expect([fullOf(low), needOf(low)]).toEqual([0, 1])
  })

  it("clears once no pack is open, and on a counted item", () => {
    expect(withStock(flour({ openLow: true }), 0).openLow).toBeUndefined()
    expect(normalise({ ...flour({ openLow: true }), type: "counted" }).openLow).toBeUndefined()
  })

  it("syncs as open_low", () => {
    const row = toRow(flour({ openLow: true }), new Set(["baking"]))
    expect(row.open_low).toBe(true)
    expect(toItem({ ...row, list_entries: null } as unknown as Row).openLow).toBe(true)
    expect(toRow(flour(), new Set(["baking"])).open_low).toBe(false)
  })
})

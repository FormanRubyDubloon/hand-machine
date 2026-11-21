// The item panel's rules (claude/handoff-item-panel.md, section 7), which the phone and Claude share.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { addListBox, listBox, normalise, openUnit, unitsOf, withUnits, type Item } from "../../pantry-app/src/model"
import { toItem, toRow, type Row } from "../../shared/src/rows"

const flour = (patch: Partial<Item> = {}): Item =>
  normalise({
    id: "flour", name: "Plain flour", type: "bulk", target: 2, inStock: 2, open: 1, unit: ["bag", "bags"], categoryId: "baking", where: [],
    useBy: ["2027-01-12", "2027-04-18"], openedAt: ["2026-10-02"], useWithinWeeks: 8, ...patch,
  })

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date("2026-11-20T12:00:00"))
})
afterEach(() => vi.useRealTimers())

describe("units", () => {
  it("gives every unit its own date, whatever the minimum", () => {
    const eggs = normalise({ id: "eggs", name: "Eggs", type: "counted", target: 0, inStock: 3, categoryId: "x", where: [], useBy: ["2026-11-25"] })
    expect(eggs.useBy).toEqual(["2026-11-25", null, null])
  })

  it("sorts open packs first, then soonest use-by, undated last", () => {
    const i = flour()
    const next = withUnits(i, [...unitsOf(i), { open: false, useBy: null, openedAt: null }, { open: false, useBy: "2026-12-01", openedAt: null }])
    expect(unitsOf(next).map((u) => [u.open, u.useBy])).toEqual([
      [true, "2027-01-12"], [false, "2026-12-01"], [false, "2027-04-18"], [false, null],
    ])
    expect(next.inStock).toBe(4)
    expect(next.open).toBe(1)
  })
})

describe("opening a pack", () => {
  it("moves the use-by to today plus the use-within period when that's sooner", () => {
    const { item, movedTo } = openUnit(flour(), 1)
    expect(movedTo).toBe("2027-01-15")
    expect(item.open).toBe(2)
    expect(unitsOf(item)[1]).toEqual({ open: true, useBy: "2027-01-15", openedAt: "2026-11-20" })
  })

  it("keeps the printed date when it's sooner", () => {
    const { movedTo } = openUnit(flour({ useBy: ["2027-01-12", "2026-12-01"] }), 1)
    expect(movedTo).toBeNull()
  })

  it("leaves the date alone with no use-within period", () => {
    expect(openUnit(flour({ useWithinWeeks: undefined }), 1).movedTo).toBeNull()
  })
})

describe("the shopping-list box", () => {
  it("explains that open packs don't count", () => {
    expect(listBox(flour())).toEqual({
      on: true, head: "1 on the shopping list",
      reason: "Open bags don't count towards your minimum of 2. You have 1 full, so 1 is on the list.",
    })
  })

  it("says when the minimum is met", () => {
    expect(listBox(flour({ open: 0, openedAt: [] })).reason).toBe("2 full bags meet your minimum of 2. It goes on the list when that drops below 2.")
  })

  it("says why something that isn't a Staple is off the list", () => {
    expect(listBox(flour({ target: 0 })).head).toBe("Not on the shopping list")
  })

  it("reads ahead while adding", () => {
    expect(addListBox(flour({ open: 0, inStock: 1 })).head).toBe("A Staple, and 1 will go straight on the shopping list")
  })
})

describe("rows", () => {
  it("carries use within, once open, and the Counter location", () => {
    const row = toRow(flour({ location: "counter" }), new Set(["baking"]))
    expect(row.use_within_weeks).toBe(8)
    expect(row.location).toBe("counter")
    const back = toItem({ ...row, unit: "bag", list_entries: null } as unknown as Row)
    expect(back.useWithinWeeks).toBe(8)
  })
})

describe("unit plurals read from Supabase", () => {
  it("reads boxes as box and loaf as loaves", async () => {
    const { unitPair } = await import("../../shared/src/rows")
    expect(unitPair("boxes")).toEqual(["box", "boxes"])
    expect(unitPair("box")).toEqual(["box", "boxes"])
    expect(unitPair("loaf")).toEqual(["loaf", "loaves"])
    expect(unitPair("bags")).toEqual(["bag", "bags"])
    expect(unitPair("bunch")).toEqual(["bunch", "bunches"])
    expect(unitPair("tube")).toEqual(["tube", "tubes"])
  })
})

describe("the item's chosen store", () => {
  it("goes to Supabase and back", () => {
    const row = toRow(flour({ where: ["sainsburys"] }), new Set(["baking"]))
    expect(row.store_ids).toEqual(["sainsburys"])
    expect(toItem({ ...row, unit: "bag", list_entries: null } as unknown as Row).where).toEqual(["sainsburys"])
  })

  it("reads an old row with no store_ids as any store", () => {
    const row = toRow(flour(), new Set(["baking"])) as Record<string, unknown>
    delete row.store_ids
    expect(toItem({ ...row, unit: "bag", list_entries: null } as unknown as Row).where).toEqual([])
  })

  it("counts as a change to sync", async () => {
    const { fingerprint } = await import("../../shared/src/pantry-remote")
    expect(fingerprint(flour({ where: ["sainsburys"] }))).not.toBe(fingerprint(flour()))
  })
})

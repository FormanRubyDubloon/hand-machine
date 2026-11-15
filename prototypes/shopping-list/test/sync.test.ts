// What happens when items are checked off on the phone, the pantry app changes, and the phone then syncs.
import { describe, expect, it, vi } from "vitest"
import { findConflicts, merge, type Item, type ListEntry } from "../src/model"

const item = (o: Partial<Item> & { id: string }): Item => ({ name: o.id, target: 0, inStock: 2, type: "counted", categoryId: "c", where: [], ...o })
const hand = (qty: number): ListEntry => ({ source: { kind: "hand" }, qty })
// The item as both sides last agreed it. `loc` stands for a pantry-only field the phone doesn't edit.
const base = item({ id: "milk", inStock: 2, entries: [hand(3)] }) as Item & { location?: string }
const withLoc = (i: Item, location: string) => ({ ...i, location }) as Item

const run = (local: Item, remote: Item | undefined, b: Item | undefined = base, resolutions = {}) =>
  merge({ [local.id]: local }, b ? { [b.id]: b } : {}, remote ? { [remote.id]: remote } : {}, resolutions)[local.id]

describe("phone checks items off, pantry changes, phone syncs", () => {
  it("keeps the phone's stock when the pantry didn't touch the item", () => {
    expect(run({ ...base, inStock: 5 }, base).inStock).toBe(5)
  })

  it("takes the pantry's change to an item the phone didn't touch", () => {
    const out = run(base, { ...base, inStock: 7, target: 4, name: "Oat milk" })
    expect(out).toMatchObject({ inStock: 7, target: 4, name: "Oat milk" })
  })

  it("keeps the phone's stock and the pantry's other fields on the same item", () => {
    const remote = withLoc({ ...base, name: "Whole milk", target: 1 }, "fridge")
    const out = run({ ...base, inStock: 4 }, remote) as Item & { location?: string }
    expect(out.inStock).toBe(4)
    expect(out.name).toBe("Whole milk")
    expect(out.target).toBe(1)
    expect(out.location).toBe("fridge")
  })

  it("flags a conflict when both changed stock to different numbers, and uses the choice", () => {
    const local = { ...base, inStock: 4 }
    const remote = { ...base, inStock: 6 }
    expect(findConflicts({ milk: local }, { milk: base }, { milk: remote })).toEqual(["milk"])
    expect(run(local, remote, base, { milk: 6 }).inStock).toBe(6)
    expect(run(local, remote, base, { milk: 4 }).inStock).toBe(4)
  })

  it("is no conflict when both changed stock to the same number", () => {
    const both = { ...base, inStock: 4 }
    expect(findConflicts({ milk: both }, { milk: base }, { milk: both })).toEqual([])
    expect(run(both, both).inStock).toBe(4)
  })

  it("is no conflict when only one side changed stock", () => {
    expect(findConflicts({ milk: { ...base, inStock: 4 } }, { milk: base }, { milk: { ...base, target: 2 } })).toEqual([])
  })

  it("lets go of an item the pantry deleted if the phone didn't change it", () => {
    const out = merge({ milk: base }, { milk: base }, {}, {})
    expect(out.milk).toBeUndefined()
  })

  it("keeps an item the pantry deleted if it was checked off on the phone", () => {
    const out = merge({ milk: { ...base, inStock: 4 } }, { milk: base }, {}, {})
    expect(out.milk.inStock).toBe(4)
  })

  it("takes the pantry's list entries when the phone only bought things", () => {
    const remote = { ...base, entries: [hand(3), hand(1)] }
    // Bought 1 (2 -> 3): the oldest entry shrinks by 1.
    const out = run({ ...base, inStock: 3 }, remote)
    expect(out.entries).toEqual([hand(2), hand(1)])
  })

  it("drops the pantry's entry changes when the phone also changed the entries", () => {
    // The known loss: phone entries win outright.
    const local = { ...base, entries: [hand(3), hand(5)] }
    const remote = { ...base, entries: [hand(3), hand(1)] }
    expect(run(local, remote).entries).toEqual([hand(3), hand(5)])
  })

  it("clears New once stock is bought on the phone", () => {
    const fresh = { ...base, inStock: 0, review: true, entries: undefined }
    expect(run({ ...fresh, inStock: 1 }, fresh, fresh).review).toBeUndefined()
  })
})

// What the phone writes to Supabase.
const calls: { table: string; op: string; arg?: unknown }[] = []
vi.mock("@/lib/supabase", () => {
  const chain = (table: string) => {
    const c: Record<string, unknown> = {}
    for (const op of ["upsert", "update", "delete", "insert"]) {
      c[op] = (arg?: unknown) => (calls.push({ table, op, arg }), c)
    }
    c.eq = () => c
    c.in = () => c
    c.then = (res: (v: unknown) => void) => res({ error: null })
    return c
  }
  return { supabase: { from: chain } }
})

describe("what the phone writes", () => {
  it("updates only stock, New and entries for items the pantry already has", async () => {
    const { writeRemote } = await import("../../shared/src/pantry-remote")
    calls.length = 0
    const i = { ...base, inStock: 4, location: "fridge" } as never
    const back = await writeRemote([i], [], new Set(["c"]), new Set(["milk"]))
    const upd = calls.find((c) => c.table === "items" && c.op === "update")
    expect(Object.keys(upd!.arg as object).sort()).toEqual(["edited_at", "in_stock", "needs_review"])
    expect(calls.some((c) => c.table === "items" && c.op === "upsert")).toBe(false)
    expect(back.milk.inStock).toBe(4)
  })

  it("sends a full row for an item new on the phone", async () => {
    const { writeRemote } = await import("../../shared/src/pantry-remote")
    calls.length = 0
    await writeRemote([item({ id: "new" }) as never], [], new Set(["c"]))
    const up = calls.find((c) => c.table === "items" && c.op === "upsert")
    expect((up!.arg as { id: string }[])[0].id).toBe("new")
    expect(calls.some((c) => c.table === "items" && c.op === "update")).toBe(false)
  })
})

import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Item, PhoneState } from "../src/data/state"
import { emptyState } from "../src/data/state"

// Supabase as a plain object: what it holds, and what got written.
const db = vi.hoisted(() => ({ items: {} as Record<string, unknown>, written: [] as unknown[], history: [] as unknown[] }))

vi.mock("../../prototypes/shared/src/pantry-remote", () => ({
  fetchRemote: async () => ({ items: JSON.parse(JSON.stringify(db.items)), categories: new Set(["dairy"]) }),
  writeRemote: async (push: Item[]) => {
    db.written.push(...push)
    return Object.fromEntries(push.map((i) => [i.id, i]))
  },
  writeHistory: async (rows: unknown[]) => void db.history.push(...rows),
}))
vi.mock("../../prototypes/pantry-app/src/sync", () => ({
  syncCategories: async (local: unknown[]) => ({ categories: local, remove: [], pushed: 0, pulled: 0 }),
  syncStores: async (local: unknown[]) => ({ stores: local, pushed: 0, pulled: 0 }),
  syncRecipes: async (local: unknown[]) => ({ recipes: local, pushed: 0, pulled: 0 }),
}))

const { applySync, pendingCount, runSync } = await import("../src/data/sync")

const egg = (over: Partial<Item> = {}): Item => ({ id: "eggs", name: "Eggs", type: "counted", target: 6, inStock: 4, categoryId: "dairy", where: [], ...over })
const phone = (over: Partial<PhoneState>): PhoneState => ({ ...emptyState(), owner: { id: "u", email: "a@b.c" }, ...over })

beforeEach(() => {
  db.items = {}
  db.written = []
  db.history = []
})

describe("sync", () => {
  it("first sync takes the pantry from Supabase", async () => {
    db.items = { eggs: egg() }
    const s = phone({})
    const after = applySync(s, s, await runSync(s))
    expect(after.items.eggs.inStock).toBe(4)
    expect(after.synced?.items.eggs).toBeTruthy()
    expect(pendingCount(after)).toBe(0)
  })

  it("sends a change made on the phone, and its History entry", async () => {
    db.items = { eggs: egg() }
    const s = phone({ items: { eggs: egg({ inStock: 5 }) }, synced: { items: { eggs: egg() }, categories: [], stores: [], recipes: [] }, outbox: [{ id: "h1", at: new Date().toISOString(), who: "phone", title: "Got eggs" }] })
    expect(pendingCount(s)).toBe(1)
    const after = applySync(s, s, await runSync(s))
    expect(db.written).toHaveLength(1)
    expect(db.history).toHaveLength(1)
    expect(after.outbox).toEqual([])
    expect(pendingCount(after)).toBe(0)
  })

  it("a clash waits: the phone keeps its value, nothing is sent, and the next sync still asks", async () => {
    db.items = { eggs: egg({ inStock: 2 }) }
    const s = phone({ items: { eggs: egg({ inStock: 5 }) }, synced: { items: { eggs: egg() }, categories: [], stores: [], recipes: [] } })
    const after = applySync(s, s, await runSync(s))
    expect(after.conflicts.map((c) => c.itemId)).toEqual(["eggs"])
    expect(after.items.eggs.inStock).toBe(5)
    expect(db.written).toEqual([])
    const again = applySync(after, after, await runSync(after))
    expect(again.conflicts).toHaveLength(1)
  })

  it("keeps a change made while the sync was running", async () => {
    db.items = { eggs: egg({ notes: "Free range" }) }
    const s = phone({ items: { eggs: egg() }, synced: { items: { eggs: egg() }, categories: [], stores: [], recipes: [] } })
    const outcome = await runSync(s)
    const meanwhile = { ...s, items: { eggs: egg({ inStock: 3 }) } }
    const after = applySync(meanwhile, s, outcome)
    expect(after.items.eggs.inStock).toBe(3)
    // …without losing what came in from elsewhere.
    expect(after.items.eggs.notes).toBe("Free range")
    // It differs from what Supabase now has, so it goes next time.
    expect(pendingCount(after)).toBe(1)
  })
})

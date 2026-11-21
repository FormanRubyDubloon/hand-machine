// A first sync (no record of a previous one) must never send this device's copy over Supabase's:
// on the web that copy can be the built-in starter data after a reset or with fresh storage.
// On 21 Nov 2026 that overwrote renamed stores with the starters. Shared sync code, tested here
// because this project's tests already stub Supabase.
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Category, Item, Store } from "../../prototypes/pantry-app/src/model"

const db = vi.hoisted(() => ({
  stores: [] as unknown[], categories: [] as unknown[], items: {} as Record<string, unknown>,
  wroteStores: [] as unknown[], wroteCategories: [] as unknown[], wroteItems: [] as unknown[], deleted: [] as string[],
}))

vi.mock("../../prototypes/shared/src/pantry-remote", () => ({
  fetchStores: async () => JSON.parse(JSON.stringify(db.stores)),
  writeStores: async (s: unknown[]) => void db.wroteStores.push(...s),
  deleteStores: async (ids: string[]) => void db.deleted.push(...ids),
  fetchCategories: async () => JSON.parse(JSON.stringify(db.categories)),
  upsertCategories: async (rows: unknown[]) => void db.wroteCategories.push(...rows),
  toCategory: (r: Category) => r,
  fetchRemote: async () => ({ items: JSON.parse(JSON.stringify(db.items)), categories: new Set(["dairy"]) }),
  writeRemote: async (push: Item[]) => {
    db.wroteItems.push(...push)
    return Object.fromEntries(push.map((i) => [i.id, i]))
  },
  fingerprint: (i: unknown) => (i ? JSON.stringify(i) : ""),
  sortKeys: (v: unknown) => v,
}))

const { syncStores, syncCategories, syncItems } = await import("../../prototypes/pantry-app/src/sync")

const mine: Store = { id: "sainsburys", name: "Sainsbury's", place: "Dalston", aisles: { dairy: 3 } }
const starter: Store = { id: "sainsburys", name: "Sainsbury's, Stoke Newington", place: "Stoke Newington", aisles: { dairy: 3 } }
const dairy: Category = { id: "dairy", name: "Dairy" }

beforeEach(() => {
  db.stores = [mine]
  db.categories = [{ ...dairy, name: "Dairy & chilled", sort: 0 }]
  db.items = {}
  db.wroteStores = []
  db.wroteCategories = []
  db.wroteItems = []
  db.deleted = []
})

describe("a first sync keeps Supabase's copy", () => {
  it("doesn't send the starter stores over renamed ones", async () => {
    const out = await syncStores([starter], undefined, [dairy])
    expect(db.wroteStores).toEqual([])
    expect(out.stores[0].name).toBe("Sainsbury's")
  })

  it("still sends a store that's new on this computer", async () => {
    const added: Store = { id: "corner", name: "Corner shop", aisles: {} }
    await syncStores([starter, added], undefined, [dairy])
    expect(db.wroteStores).toEqual([expect.objectContaining({ id: "corner" })])
  })

  it("doesn't send starter categories over Supabase's", async () => {
    await syncCategories([dairy], undefined)
    expect(db.wroteCategories).toEqual([])
  })

  it("doesn't send a stale item over Supabase's", async () => {
    const egg = (inStock: number): Item => ({ id: "eggs", name: "Eggs", type: "counted", target: 6, inStock, categoryId: "dairy", where: [] })
    db.items = { eggs: egg(12) }
    const out = await syncItems({ eggs: egg(2) }, undefined)
    expect(db.wroteItems).toEqual([])
    expect(out.items.eggs.inStock).toBe(12)
  })

  it("after the first sync, a change here is still sent", async () => {
    const renamed = { ...mine, name: "Sainsbury's Local" }
    await syncStores([renamed], [mine], [dairy])
    expect(db.wroteStores).toEqual([expect.objectContaining({ name: "Sainsbury's Local" })])
  })
})

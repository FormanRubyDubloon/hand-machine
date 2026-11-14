// Data model, seed data and the pure functions that derive the shopping list.
// Shaped like the Notion "Pantry" database described in HANDOFF.md.

export type Category = { id: string; name: string }

export type Item = {
  id: string
  name: string
  /** Notion "Target": how many to keep. */
  target: number
  /** Notion "In stock": what the app writes back. */
  inStock: number
  /** Singular and plural unit, e.g. ["loaf", "loaves"]. */
  unit?: [string, string]
  notes?: string
  categoryId: string
  ordered: boolean
  /** Notion "Where": store ids that sell it. Empty means any store with the category. */
  where: string[]
  /** When it last changed in Notion (mock only). */
  editedAt?: string
}

export type Store = {
  id: string
  name: string
  /** Aisle number per category. null = not sold here. */
  aisles: Record<string, number | null>
}

export type Filter = "all" | "out" | "low"

export type Session = {
  storeId: string
  aisleIndex: number
  skipped: string[]
  /** In stock per item when the shop started. "Needed" is measured from here. */
  startStock: Record<string, number>
  finished: boolean
}

export type Items = Record<string, Item>

export type SyncRun = {
  phase: "sending" | "receiving" | "paused" | "finishing"
  progress: number
  /** Local items when the sync started. Ticks after this go in the next sync. */
  snapshot: Items
  outgoing: number
  /** Conflicting item ids, and the in-stock value chosen for each. */
  conflicts: string[]
  resolutions: Record<string, number>
}

export type State = {
  categories: Category[]
  items: Items
  /** What Notion had at the last sync. */
  baseline: Items
  order: string[]
  stores: Store[]
  lastStoreId: string | null
  session: Session | null
  filter: Filter
  lastSyncedAt: string
  sync: SyncRun | null
  simulateOffline: boolean
}

// ---------- seed ----------

const categories: Category[] = [
  { id: "fruit", name: "Fruit & veg" },
  { id: "meat", name: "Meat & fish" },
  { id: "deli", name: "Deli & cured meats" },
  { id: "bread", name: "Bread & crackers" },
  { id: "frozen", name: "Frozen" },
  { id: "bathroom", name: "Bathroom & kitchen" },
]

const seedItems: Item[] = [
  { id: "lemons", name: "Lemons", target: 6, inStock: 2, categoryId: "fruit", ordered: false, where: [] },
  { id: "chillis", name: "Chillis", target: 3, inStock: 1, notes: "Habanero", categoryId: "fruit", ordered: false, where: [] },
  { id: "fennel", name: "Fennel", target: 1, inStock: 0, unit: ["bulb", "bulbs"], categoryId: "fruit", ordered: false, where: [] },
  { id: "sweet-potatoes", name: "Sweet potatoes", target: 4, inStock: 0, categoryId: "fruit", ordered: false, where: [] },
  { id: "kiwis", name: "Kiwis", target: 3, inStock: 0, categoryId: "fruit", ordered: false, where: [] },
  { id: "asparagus", name: "Asparagus", target: 1, inStock: 0, unit: ["bunch", "bunches"], categoryId: "fruit", ordered: false, where: [] },
  { id: "steak", name: "Steak", target: 2, inStock: 0, categoryId: "meat", ordered: false, where: ["supermarket", "butcher"] },
  { id: "chicken", name: "Chicken", target: 1, inStock: 0, notes: "Thighs", categoryId: "meat", ordered: true, where: ["supermarket", "butcher"] },
  { id: "kimchi", name: "Kimchi", target: 2, inStock: 1, categoryId: "deli", ordered: false, where: [] },
  { id: "saucisson", name: "Saucisson", target: 1, inStock: 0, unit: ["piece", "pieces"], categoryId: "deli", ordered: false, where: [] },
  { id: "sourdough", name: "Sourdough bread", target: 1, inStock: 0, unit: ["loaf", "loaves"], categoryId: "bread", ordered: false, where: [] },
  { id: "crackers", name: "Oatcakes", target: 2, inStock: 2, categoryId: "bread", ordered: false, where: [] },
  { id: "peas", name: "Peas", target: 1, inStock: 1, categoryId: "frozen", ordered: false, where: [] },
  { id: "fish-fingers", name: "Fish fingers", target: 1, inStock: 0, categoryId: "frozen", ordered: true, where: [] },
  { id: "steel-wool", name: "Steel wool", target: 1, inStock: 0, categoryId: "bathroom", ordered: false, where: [] },
  { id: "tin-foil", name: "Tin foil", target: 2, inStock: 1, categoryId: "bathroom", ordered: true, where: [] },
]

const stores: Store[] = [
  { id: "supermarket", name: "Supermarket", aisles: { fruit: 1, meat: 4, deli: 5, bread: 7, frozen: null, bathroom: 12 } },
  { id: "corner-shop", name: "Corner shop", aisles: { fruit: 2, meat: null, deli: null, bread: 1, frozen: 3, bathroom: 4 } },
  { id: "greengrocer", name: "Greengrocer", aisles: { fruit: 1, meat: null, deli: null, bread: null, frozen: null, bathroom: null } },
  { id: "butcher", name: "Butcher", aisles: { fruit: null, meat: 1, deli: 2, bread: null, frozen: null, bathroom: null } },
  { id: "fishmonger", name: "Fishmonger", aisles: { fruit: null, meat: 1, deli: null, bread: null, frozen: null, bathroom: null } },
]

const byId = (list: Item[]): Items => Object.fromEntries(list.map((i) => [i.id, i]))

function todayAt(h: number, m: number) {
  const d = new Date()
  d.setHours(h, m, 0, 0)
  return d.toISOString()
}

export function seedState(): State {
  const items = byId(seedItems)
  return {
    categories,
    items,
    baseline: structuredClone(items),
    order: seedItems.map((i) => i.id),
    stores,
    lastStoreId: "supermarket",
    session: null,
    filter: "all",
    lastSyncedAt: todayAt(10, 2),
    sync: null,
    simulateOffline: false,
  }
}

/** What "Notion" has: the baseline plus edits made there since the last sync. */
export function seedRemote(): Items {
  const remote = byId(structuredClone(seedItems))
  remote.sourdough = { ...remote.sourdough, target: 2, editedAt: todayAt(11, 15) }
  remote.lemons = { ...remote.lemons, inStock: 1, editedAt: todayAt(11, 40) }
  remote.tissues = {
    id: "tissues", name: "Tissues", target: 3, inStock: 0, categoryId: "bathroom",
    ordered: false, where: [], editedAt: todayAt(11, 20),
  }
  return remote
}

// ---------- derive ----------

export const remainingOf = (i: Item) => Math.max(0, i.target - i.inStock)

export type Stock = "out" | "low" | null
export const stockOf = (target: number, inStock: number): Stock =>
  inStock <= 0 ? "out" : inStock < target ? "low" : null

export const matchesFilter = (stock: Stock, filter: Filter) => filter === "all" || stock === filter

export function soldAt(item: Item, store: Store) {
  const aisle = store.aisles[item.categoryId]
  if (aisle === null || aisle === undefined) return false
  return item.where.length === 0 || item.where.includes(store.id)
}

export type Aisle = { number: number; categoryIds: string[]; name: string }

/** A store's aisles, lowest number first. Categories sharing a number merge into one aisle. */
export function aislesOf(store: Store, cats: Category[]): Aisle[] {
  const groups = new Map<number, string[]>()
  for (const c of cats) {
    const n = store.aisles[c.id]
    if (n === null || n === undefined) continue
    groups.set(n, [...(groups.get(n) ?? []), c.id])
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a - b)
    .map(([number, ids]) => ({
      number,
      categoryIds: ids,
      name: ids.map((id) => cats.find((c) => c.id === id)!.name).join(" · "),
    }))
}

export type ListItem = {
  item: Item
  needed: number
  got: number
  remaining: number
  stock: Stock
  skipped: boolean
  state: "to-get" | "partly-got" | "got" | "skipped"
}

/** An item as it appears in a shop: measured from the stock when the shop began. */
export function listItem(item: Item, session: Session): ListItem {
  const start = session.startStock[item.id] ?? item.inStock
  const needed = Math.max(0, item.target - start)
  const got = Math.min(needed, Math.max(0, item.inStock - start))
  const remaining = needed - got
  const skipped = session.skipped.includes(item.id) && remaining > 0
  return {
    item, needed, got, remaining, skipped,
    stock: stockOf(item.target, start),
    state: remaining === 0 ? "got" : skipped ? "skipped" : got > 0 ? "partly-got" : "to-get",
  }
}

export function unitText(item: Item, n: number) {
  if (!item.unit) return null
  return `${n} ${n === 1 ? item.unit[0] : item.unit[1]}`
}

export function itemDescription(li: ListItem) {
  const { item, needed, got, state } = li
  if (state === "got") return item.unit && needed === 1 ? `Got ${unitText(item, 1)}` : `Got ${needed} of ${needed}`
  if (state === "partly-got") return `Got ${got} of ${needed}`
  return item.notes ?? unitText(item, needed) ?? undefined
}

export type ShopAisle = Aisle & { items: ListItem[] }

/** The aisles in a shop that have something on the list, with their items. */
export function shopAisles(state: State, session: Session): ShopAisle[] {
  const store = state.stores.find((s) => s.id === session.storeId)
  if (!store) return []
  const list = state.order
    .map((id) => state.items[id])
    .filter((i) => i && soldAt(i, store))
    .map((i) => listItem(i, session))
    .filter((li) => li.needed > 0)
  return aislesOf(store, state.categories)
    .map((a) => ({ ...a, items: list.filter((li) => a.categoryIds.includes(li.item.categoryId)) }))
    .filter((a) => a.items.length > 0)
}

/** Items still to get at a store right now (no shop needed). */
export function toGetAt(state: State, store: Store) {
  return state.order
    .map((id) => state.items[id])
    .filter((i) => i && soldAt(i, store) && remainingOf(i) > 0)
}

export function nameList(names: string[]) {
  if (names.length <= 4) return names.join(", ")
  return `${names.slice(0, 3).join(", ")} and ${names.length - 3} more`
}

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

export function formatSynced(iso: string) {
  const d = new Date(iso)
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
  const today = new Date().toDateString() === d.toDateString()
  return today ? `today, ${time}` : `${d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}, ${time}`
}

export const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })

// ---------- sync ----------

export type Change = {
  item: Item
  kind: "stock" | "target" | "new" | "other"
  from?: number
  to?: number
}

/** Local changes not yet in Notion. */
export function outgoingChanges(items: Items, baseline: Items): Change[] {
  return Object.values(items).flatMap((i): Change[] => {
    const b = baseline[i.id]
    if (!b) return [{ item: i, kind: "new" }]
    if (i.inStock !== b.inStock) return [{ item: i, kind: "stock", from: b.inStock, to: i.inStock }]
    return []
  })
}

/** Notion changes not yet in the app. */
export function incomingChanges(remote: Items, baseline: Items): Change[] {
  return Object.values(remote).flatMap((r): Change[] => {
    const b = baseline[r.id]
    if (!b) return [{ item: r, kind: "new" }]
    if (r.target !== b.target) return [{ item: r, kind: "target", from: b.target, to: r.target }]
    if (r.inStock !== b.inStock) return [{ item: r, kind: "stock", from: b.inStock, to: r.inStock }]
    if (r.name !== b.name || r.notes !== b.notes || r.ordered !== b.ordered || r.categoryId !== b.categoryId)
      return [{ item: r, kind: "other" }]
    return []
  })
}

/** Items whose stock changed both here and in Notion. */
export function findConflicts(local: Items, baseline: Items, remote: Items) {
  return Object.keys(local).filter((id) => {
    const b = baseline[id]
    const r = remote[id]
    return b && r && local[id].inStock !== b.inStock && r.inStock !== b.inStock && local[id].inStock !== r.inStock
  })
}

/** Two-way merge. Notion wins on everything except stock the phone changed. */
export function merge(local: Items, baseline: Items, remote: Items, resolutions: Record<string, number>): Items {
  const out: Items = {}
  for (const id of new Set([...Object.keys(local), ...Object.keys(remote)])) {
    const l = local[id]
    const r = remote[id]
    const b = baseline[id]
    if (l && !r) {
      // New on the phone, or deleted in Notion. Deleting isn't modelled, so keep it.
      out[id] = l
      continue
    }
    if (!l) {
      out[id] = r
      continue
    }
    const localChanged = !b || l.inStock !== b.inStock
    const inStock = id in resolutions ? resolutions[id] : localChanged ? l.inStock : r.inStock
    out[id] = { ...r, inStock }
  }
  return out
}

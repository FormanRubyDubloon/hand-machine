// Data model and the pure functions that derive the shopping list.
// Shaped like the pantry described in intent.md and HANDOFF.md.
import { at, seedCategories, seedItems, seedPantryItems, seedRecipes, seedStores } from "../../shared/src/pantry"

export type Category = { id: string; name: string }

/** Why something is on the list besides being a Staple that ran low. */
export type ListSource = { kind: "hand" } | { kind: "claude" } | { kind: "recipe"; recipe: string }
export type ListEntry = { source: ListSource; qty: number }

export type Item = {
  id: string
  name: string
  /** The item's minimum. Above 0 makes it a Staple, which goes on the list by itself when it runs low. */
  target: number
  /**
   * What you have. Counted items: a number. Bulk items: whole packs, including any open one.
   * Written back to the pantry at sync.
   */
  inStock: number
  /** Counted (eggs, tins) or bulk (rice, flour, oil). */
  type: "counted" | "bulk"
  /** Bulk only: how many of the packs in `inStock` are open. An open pack doesn't count towards the minimum. */
  open?: number
  /** Singular and plural unit, e.g. ["loaf", "loaves"]. */
  unit?: [string, string]
  notes?: string
  categoryId: string
  /** Pantry "Shop": store ids that sell it. Empty means any store with the category. */
  where: string[]
  /** Things on the list for this item that aren't just a Staple running low. */
  entries?: ListEntry[]
  /** When it last changed in the pantry app (mock only). */
  editedAt?: string
}

export type RecipeIngredient = {
  /** The recipe's own wording. */
  text: string
  itemId: string
  /** Counted items: how many the recipe needs. Bulk items only need to be in the pantry. */
  need: number
  /** How many to put on the list when this is missing. */
  buy: number
}

export type Recipe = {
  id: string
  name: string
  minutes: number
  serves: number
  /** Saved on the phone so it opens with no signal. */
  wantToCook: boolean
  /** Short note for the list, e.g. "uses salmon, use by tomorrow". */
  soon?: string
  ingredients: RecipeIngredient[]
  method: string[]
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
  /** What the pantry had at the last sync. */
  baseline: Items
  recipes: Recipe[]
  signedIn: boolean
  order: string[]
  stores: Store[]
  /** Stores as they were at the last sync. If they changed here, the phone's go to the pantry; otherwise the pantry's come here. */
  storesBaseline: Store[]
  lastStoreId: string | null
  session: Session | null
  filter: Filter
  lastSyncedAt: string
  sync: SyncRun | null
  simulateOffline: boolean
}

// ---------- seed ----------
// One seed for both prototypes: see prototypes/shared/src/pantry.ts.

const byId = (list: Item[]): Items => Object.fromEntries(list.map((i) => [i.id, i]))

export function seedState(): State {
  const items = byId(structuredClone(seedItems))
  return {
    categories: seedCategories,
    items,
    baseline: structuredClone(items),
    recipes: structuredClone(seedRecipes),
    signedIn: false,
    order: seedItems.map((i) => i.id),
    stores: structuredClone(seedStores),
    storesBaseline: structuredClone(seedStores),
    lastStoreId: "sainsburys",
    session: null,
    filter: "all",
    lastSyncedAt: at(10, 2),
    sync: null,
    simulateOffline: false,
  }
}

/** What the pantry has: the baseline plus edits made in the pantry app or by Claude since the last sync. */
export function seedRemote(): Items {
  return seedPantryItems()
}

// ---------- derive ----------

export const isStaple = (i: Item) => i.target > 0
const isBulk = (i: Item) => i.type === "bulk"

/** Whole packs that count towards the minimum. An open pack doesn't. */
export const fullOf = (i: Item, total = i.inStock) => (isBulk(i) ? Math.max(0, total - (i.open ?? 0)) : total)

/** How many a Staple is short of its minimum. Never counts the open pack. */
const shortfall = (i: Item, total = i.inStock) => Math.max(0, i.target - fullOf(i, total))

const entryTotal = (i: Item) => (i.entries ?? []).reduce((n, e) => n + e.qty, 0)

/** The first recipe this item is on the list for, if any. */
export const recipeFor = (i: Item) => {
  const e = i.entries?.find((e) => e.source.kind === "recipe")
  return e && e.source.kind === "recipe" ? e.source.recipe : null
}

/** Takes `bought` units off a list's entries, oldest first. */
function settle(entries: ListEntry[] | undefined, bought: number): ListEntry[] | undefined {
  if (!entries?.length) return entries
  let left = bought
  const out: ListEntry[] = []
  for (const e of entries) {
    if (left >= e.qty) left -= e.qty
    else {
      out.push({ ...e, qty: e.qty - left })
      left = 0
    }
  }
  return out
}

/**
 * How many to buy right now, outside a shop. A Staple needs its minimum, counting full packs only.
 * List entries need their quantity less whatever has been bought since the last sync.
 */
export function needOf(i: Item, baseline: Items) {
  const bought = Math.max(0, i.inStock - (baseline[i.id]?.inStock ?? 0))
  const entries = (settle(i.entries, bought) ?? []).reduce((n, e) => n + e.qty, 0)
  return Math.max(shortfall(i), entries)
}

export type Stock = "out" | "low" | null
/** Only Staples are Out or Low. Bulk items go Low while you have packs but too few full ones. */
export const stockOf = (i: Item, total = i.inStock): Stock =>
  !isStaple(i) ? null : total <= 0 ? "out" : fullOf(i, total) < i.target ? "low" : null

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
  /** Out or Low, from the stock when the shop began. Staples only. */
  stock: Stock
  /** On the list only because of a recipe (not a Staple). */
  recipeOnly: boolean
  skipped: boolean
  state: "to-get" | "partly-got" | "got" | "skipped"
}

/** An item as it appears in a shop: measured from the stock when the shop began. */
export function listItem(item: Item, session: Session): ListItem {
  const start = session.startStock[item.id] ?? item.inStock
  const needed = Math.max(shortfall(item, start), entryTotal(item))
  const got = Math.min(needed, Math.max(0, item.inStock - start))
  const remaining = needed - got
  const skipped = session.skipped.includes(item.id) && remaining > 0
  return {
    item, needed, got, remaining, skipped,
    stock: stockOf(item, start),
    recipeOnly: !isStaple(item) && recipeFor(item) !== null,
    state: remaining === 0 ? "got" : skipped ? "skipped" : got > 0 ? "partly-got" : "to-get",
  }
}

export function unitText(item: Item, n: number) {
  if (!item.unit) return null
  return `${n} ${n === 1 ? item.unit[0] : item.unit[1]}`
}

/** What you have, the way you'd say it: "3 bags, 1 open". */
export function haveText(item: Item, total = item.inStock) {
  const base = unitText(item, total) ?? String(total)
  if (!isBulk(item) || !item.open) return base
  // One bag that's open reads "1 bag, open"; more than one reads "3 bags, 1 open".
  return total === 1 ? `${base}, open` : `${base}, ${item.open} open`
}

export function itemDescription(li: ListItem) {
  const { item, needed, got, state } = li
  const recipe = recipeFor(item)
  const suffix = recipe ? `${isStaple(item) ? "also for" : "for"} ${recipe}` : null
  const join = (...parts: (string | null | undefined)[]) => parts.filter(Boolean).join(" · ") || undefined

  if (state === "got") {
    if (isBulk(item)) return `Got ${unitText(item, needed) ?? needed} · now ${haveText(item)}`
    return item.unit && needed === 1 ? `Got ${unitText(item, 1)}` : `Got ${needed} of ${needed}`
  }
  if (state === "partly-got") return `Got ${got} of ${needed}`
  if (isBulk(item)) {
    const start = item.inStock - got
    return join(`${start > 0 ? haveText(item, start) : "None"} · keep ${item.target}`, suffix)
  }
  return join(item.notes ?? unitText(item, needed) ?? (isStaple(item) ? null : `${needed} to get`), suffix)
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
    .filter((i) => i && soldAt(i, store) && needOf(i, state.baseline) > 0)
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

// ---------- recipes ----------

/** have: enough in stock. some: an open pack, so maybe not enough. listed: not in stock but on the list. short: neither. */
export type IngredientStatus = "have" | "some" | "listed" | "short"

export function ingredientStatus(ing: RecipeIngredient, item: Item | undefined, baseline: Items): IngredientStatus {
  if (!item) return "short"
  if (isBulk(item)) {
    if (item.inStock > 0) return (item.open ?? 0) > 0 ? "some" : "have"
  } else if (item.inStock >= ing.need) return "have"
  return needOf(item, baseline) > 0 ? "listed" : "short"
}

export function recipeSummary(recipe: Recipe, state: State) {
  const rows = recipe.ingredients.map((ing) => {
    const item = state.items[ing.itemId]
    return { ing, item, status: ingredientStatus(ing, item, state.baseline) }
  })
  const short = rows.filter((r) => r.status === "short")
  return { rows, short, canCook: rows.every((r) => r.status === "have" || r.status === "some") }
}

// ---------- sync ----------

export type Change = {
  item: Item
  kind: "stock" | "target" | "new" | "list" | "other"
  from?: number
  to?: number
}

const sameEntries = (a?: ListEntry[], b?: ListEntry[]) => JSON.stringify(a ?? []) === JSON.stringify(b ?? [])

/** Local changes not yet in the pantry. */
export function outgoingChanges(items: Items, baseline: Items): Change[] {
  return Object.values(items).flatMap((i): Change[] => {
    const b = baseline[i.id]
    if (!b) return [{ item: i, kind: "new" }]
    if (i.inStock !== b.inStock) return [{ item: i, kind: "stock", from: b.inStock, to: i.inStock }]
    if (!sameEntries(i.entries, b.entries)) return [{ item: i, kind: "list" }]
    return []
  })
}

/** Pantry changes not yet in the app. */
export function incomingChanges(remote: Items, baseline: Items): Change[] {
  return Object.values(remote).flatMap((r): Change[] => {
    const b = baseline[r.id]
    if (!b) return [{ item: r, kind: "new" }]
    if (r.target !== b.target) return [{ item: r, kind: "target", from: b.target, to: r.target }]
    if (r.inStock !== b.inStock) return [{ item: r, kind: "stock", from: b.inStock, to: r.inStock }]
    if (!sameEntries(r.entries, b.entries)) return [{ item: r, kind: "list" }]
    if (r.name !== b.name || r.notes !== b.notes || r.categoryId !== b.categoryId) return [{ item: r, kind: "other" }]
    return []
  })
}

/** Items whose stock changed both here and in the pantry app. */
export function findConflicts(local: Items, baseline: Items, remote: Items) {
  return Object.keys(local).filter((id) => {
    const b = baseline[id]
    const r = remote[id]
    return b && r && local[id].inStock !== b.inStock && r.inStock !== b.inStock && local[id].inStock !== r.inStock
  })
}

/**
 * Two-way merge. The pantry wins on everything except what the phone changed: stock, and list entries
 * added here. Entries are then settled against what was bought, so bought items leave the list.
 */
export function merge(local: Items, baseline: Items, remote: Items, resolutions: Record<string, number>): Items {
  const out: Items = {}
  for (const id of new Set([...Object.keys(local), ...Object.keys(remote)])) {
    const l = local[id]
    const r = remote[id]
    const b = baseline[id]
    if (l && !r) {
      // New on the phone, or deleted in the pantry. Deleting isn't modelled, so keep it.
      out[id] = { ...l, entries: settle(l.entries, l.inStock) }
      continue
    }
    if (!l) {
      out[id] = r
      continue
    }
    const stockChanged = !b || l.inStock !== b.inStock
    const inStock = id in resolutions ? resolutions[id] : stockChanged ? l.inStock : r.inStock
    const entries = b && sameEntries(l.entries, b.entries) ? r.entries : l.entries
    const bought = stockChanged ? Math.max(0, l.inStock - (b?.inStock ?? 0)) : 0
    out[id] = { ...r, inStock, entries: settle(entries, bought) }
  }
  return out
}

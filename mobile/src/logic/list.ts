// The shopping list in a shop: what to get, in the order you walk the store, and the shop in progress.
// Pure, so it's tested (test/list.test.ts). The rules come from intent.md ("The shopping list") and the PROTO-1
// handoff (section 6).
import { entryTotal, isStaple, needOf, normalise, settle, shortfall, stockOf, type Category, type Item, type Items, type Store } from "../../../prototypes/pantry-app/src/model"
import type { PhoneState, Shop } from "../data/state"
import { count } from "./phrases"

/** One aisle number in a store, with the categories that share it. `number` is null for "No aisle number". */
export type Aisle = { key: string; number: number | null; categories: Category[] }

/** The aisle number a category has in a store, or null. */
export const numberOf = (store: Store | undefined, categoryId: string) => {
  // "This store has no aisle numbers": everything is listed A to Z under "No aisle number".
  if (store?.noAisleNumbers) return null
  const n = store?.aisles[categoryId]
  return n === null || n === undefined || n <= 0 ? null : n
}

/**
 * A store's aisles in walking order, lowest number first. Categories that share a number are one aisle.
 * Categories with no number at this store come last, together, as "No aisle number". Items in no known
 * category join them (as the category id ""), so nothing on the list is ever hidden.
 */
export function aislesOf(store: Store | undefined, categories: Category[]): Aisle[] {
  const groups = new Map<number, Category[]>()
  const rest: Category[] = []
  for (const c of categories) {
    const n = numberOf(store, c.id)
    if (n === null) rest.push(c)
    else groups.set(n, [...(groups.get(n) ?? []), c])
  }
  const numbered = [...groups.entries()].sort(([a], [b]) => a - b).map(([n, cats]) => ({ key: `n${n}`, number: n, categories: cats }))
  return [...numbered, { key: "none", number: null, categories: [...rest.sort((a, b) => a.name.localeCompare(b.name)), { id: "", name: "Other" }] }]
}

/** The aisle an item is walked in. */
export function aisleKeyOf(item: Item, store: Store | undefined, categories: Category[]) {
  const known = categories.some((c) => c.id === item.categoryId)
  const n = known ? numberOf(store, item.categoryId) : null
  return n === null ? "none" : `n${n}`
}

// ---------- the shop in progress ----------

/** A shop older than this starts afresh the next time the list opens. */
export const SHOP_HOURS = 10

/**
 * Brings the shop up to date with the items. Anything that needs buying and isn't in the shop joins it.
 * A row nothing has been ticked on follows the item (its amount changes, or it leaves when it's no longer
 * needed, say because Collca on the web took it off). A ticked row stays until you start a new list.
 */
export function refreshShop(shop: Shop | null, items: Items, now = new Date()): Shop {
  const fresh = !shop || now.getTime() - new Date(shop.startedAt).getTime() > SHOP_HOURS * 3_600_000
  const base: Shop = fresh ? { startedAt: now.toISOString(), rows: {} } : shop
  const rows = { ...base.rows }
  let changed = fresh
  for (const [id, row] of Object.entries(rows)) {
    const item = items[id]
    if (!item) {
      delete rows[id]
      changed = true
    } else if (row.got === 0) {
      const need = needOf(item)
      if (need <= 0) {
        delete rows[id]
        changed = true
      } else if (need !== row.need || JSON.stringify(row.entries ?? []) !== JSON.stringify(item.entries ?? [])) {
        rows[id] = { need, got: 0, entries: item.entries, review: item.review }
        changed = true
      }
    }
  }
  for (const item of Object.values(items)) {
    if (rows[item.id]) continue
    const need = needOf(item)
    if (need > 0) {
      rows[item.id] = { need, got: 0, entries: item.entries, review: item.review }
      changed = true
    }
  }
  return changed ? { ...base, rows } : base
}

/** Bought n more: stock goes up (a bulk item gains full packs), and the list entries are settled by what came in. */
export function bought(i: Item, n: number): Item {
  if (n <= 0) return i
  const useBy = i.noExpiry ? i.useBy : [...(i.useBy ?? []), ...Array<null>(n).fill(null)]
  return normalise({ ...i, inStock: i.inStock + n, useBy, entries: settle(i.entries, n), editedAt: new Date().toISOString() })
}

/** Un-ticked: takes back what was ticked, and puts the list entries and the New mark back as they were. */
export function unbought(i: Item, n: number, entries: Item["entries"], review: boolean | undefined): Item {
  if (n <= 0) return i
  const inStock = Math.max(0, i.inStock - n)
  const dates = [...(i.useBy ?? [])]
  // The packs bought in this shop were added at the end, undated.
  dates.splice(Math.max(0, dates.length - n), n)
  return normalise({ ...i, inStock, useBy: dates, open: i.open === undefined ? undefined : Math.min(i.open, inStock), entries, review, editedAt: new Date().toISOString() })
}

export type Row = {
  id: string
  item: Item
  need: number
  got: number
  left: number
  done: boolean
  /** Ordered online: stays on the list, but isn't counted as left to get. */
  ordered: boolean
  /** Not in the pantry yet: made from a recipe or added here, and not bought. */
  isNew: boolean
  /** The line under the name. */
  note: string
  /** Why it's on the list, as the pantry app's Show filter groups it. */
  group: Exclude<ListFilter["show"], "all">
  /** Ordered, or the stock it had before this shop (so ticking doesn't move it out of a filter). */
  status: "low" | "out" | "ordered" | null
}

/** The list filters, the same two as the pantry app's shopping list: why it's there, and how much is left. */
export type ListFilter = { show: "all" | "staples" | "recipes" | "added"; stock: "all" | "low" | "out" | "ordered" }
export const NO_FILTER: ListFilter = { show: "all", stock: "all" }

const FILTER_NAMES: Record<string, string> = { staples: "Staples", recipes: "For recipes", added: "Added", low: "Low", out: "Out", ordered: "Ordered" }

/** The filters that are on, by name: ["Staples", "Out"]. */
export const filterNames = (f: ListFilter | undefined) => (f ? [f.show, f.stock].filter((v) => v !== "all").map((v) => FILTER_NAMES[v]) : [])

/** How many filters are on (0, 1 or 2). */
export const filtersOn = (f: ListFilter | undefined) => (f ? Number(f.show !== "all") + Number(f.stock !== "all") : 0)

export const matchesFilter = (r: Row, f: ListFilter | undefined) =>
  !f || ((f.show === "all" || r.group === f.show) && (f.stock === "all" || r.status === f.stock))

/** Why it's on the list, said plainly. */
export function reasonOf(i: Item, startEntries = i.entries) {
  const recipe = startEntries?.find((e) => e.source.kind === "recipe")
  if (recipe && recipe.source.kind === "recipe") return `For ${recipe.source.recipe}`
  if (i.review && i.inStock <= 0) return "Not in your pantry yet"
  if (shortfall(i) > 0 || (isStaple(i) && !entryTotal(i))) {
    if (i.inStock <= 0) return "Out"
    if (i.type === "bulk" && (i.open ?? 0) > 0 && !i.openCounts) return `Open ${i.unit?.[1] ?? "packs"} don't count · minimum ${i.target}`
    return `Below your minimum of ${i.target}`
  }
  if (startEntries?.some((e) => e.source.kind === "claude")) return "Added by Claude"
  return i.notes ?? ""
}

export function rowsOf(state: Pick<PhoneState, "items" | "shop">): Row[] {
  const shop = state.shop
  if (!shop) return []
  return Object.entries(shop.rows).flatMap(([id, r]) => {
    const item = state.items[id]
    if (!item) return []
    const got = Math.min(r.got, r.need)
    const left = r.need - got
    const done = left === 0
    const reason = reasonOf(item, r.entries)
    const note = done ? `Got ${count(item, r.need)}` : got > 0 ? [`Got ${got} of ${r.need}`, reason].filter(Boolean).join(" · ") : item.ordered ? "Ordered" : reason
    // Group and grade it as it was before this shop, as the pantry app does (a Staple below its minimum first,
    // then a recipe, then anything else added).
    const before = got > 0 ? unbought(item, got, r.entries, r.review) : item
    const group = shortfall(before) > 0 ? "staples" : before.entries?.[0]?.source.kind === "recipe" ? "recipes" : "added"
    const status = item.ordered ? "ordered" : stockOf(before)
    return [{ id, item, need: r.need, got, left, done, ordered: !!item.ordered, isNew: !!r.review, note, group, status }]
  })
}

/** The rows the list filters let through. */
export const shownRows = (state: Pick<PhoneState, "items" | "shop" | "filter">) => rowsOf(state).filter((r) => matchesFilter(r, state.filter))

/** Unticked first, then ticked; A to Z within each. */
export const sortRows = (rows: Row[]) =>
  [...rows].sort((a, b) => Number(a.done) - Number(b.done) || Number(a.ordered) - Number(b.ordered) || a.item.name.localeCompare(b.item.name))

/**
 * Things still to pick up: the numbers in the rows' boxes added together, so the count drops with every tap,
 * not only when a row is finished. Ordered ones don't count: they're coming.
 */
export const leftOf = (rows: Row[]) => rows.reduce((n, r) => n + (r.ordered ? 0 : r.left), 0)

/** Everything to pick up in these rows, got or not (ordered ones aside). */
export const totalOf = (rows: Row[]) => rows.reduce((n, r) => n + (r.ordered ? 0 : r.need), 0)

export type AisleView = Aisle & { rows: Row[]; left: number; total: number }

/** The aisles of a store that have something on the list, in walking order, with their rows. */
export function shopAisles(state: Pick<PhoneState, "items" | "shop" | "stores" | "categories" | "storeId" | "filter">): AisleView[] {
  const store = state.stores.find((s) => s.id === state.storeId) ?? state.stores[0]
  const rows = shownRows(state)
  return aislesOf(store, state.categories)
    .map((a) => {
      const mine = sortRows(rows.filter((r) => aisleKeyOf(r.item, store, state.categories) === a.key))
      const used = a.categories.filter((c) => mine.some((r) => r.item.categoryId === c.id || (c.id === "" && !state.categories.some((k) => k.id === r.item.categoryId))))
      return { ...a, categories: used, rows: mine, left: leftOf(mine), total: totalOf(mine) }
    })
    .filter((a) => a.rows.length > 0)
}

/** "Aisle 4", or "No aisle number". */
export const aisleLabel = (a: Aisle) => (a.number === null ? "No aisle number" : `Aisle ${a.number}`)

/** The name of a category within an aisle, for headings ("Other" is for items in no category). */
export const categoryName = (c: Category) => c.name

/** "Got all 6 eggs." */
export const gotAllText = (r: Row) => `Got all ${count(r.item, r.need)}${r.item.unit ? ` of ${r.item.name.toLowerCase()}` : ` ${r.item.name.toLowerCase()}`}.`

/**
 * The toast after ticking a row up to `got` (`r` is the row as it was before): "Eggs: got 1, 2 to get.",
 * "Got all 6 eggs." or, when only one was needed, "Got eggs."
 */
export const tickedText = (r: Row, got: number) => {
  const name = r.item.name.toLowerCase()
  if (got >= r.need) return r.need === 1 ? `Got ${name}.` : gotAllText(r)
  const now = got - r.got
  return `${r.item.name}: got ${count(r.item, now)}, ${count(r.item, r.need - got)} to get.`
}

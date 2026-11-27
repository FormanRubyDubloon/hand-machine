// The shopping list in a shop: what to get, in the order you walk the store, and the shop in progress.
// Pure, so it's tested (test/list.test.ts). The rules come from intent.md ("The shopping list") and the PROTO-1
// handoff (section 6).
import {
  aisleLabel, aisleTitle, compareAisles, entryTotal, isStaple, itemAisle, needOf, normalise, settle, shortfall, stockOf, tagsOf,
  type AisleValue, type Category, type Item, type Items, type Store,
} from "../../../prototypes/pantry-app/src/model"
import type { PhoneState, Shop } from "../data/state"
import { count } from "./phrases"

/** Shopping by aisle (the walk round the store) or by tag (Batch 4, 24 Nov 2026). Kept on this phone. */
export type GroupBy = "aisle" | "tag"

/**
 * One heading on the list: an aisle ("Aisle 4", "Freezer", "No aisle"), a tag, or, for a store with no aisle
 * numbers, everything A to Z. `aisle` is set for aisle groups (null for No aisle); `tag` for tag groups ("" for No tag).
 */
export type Group = { key: string; title: string; aisle?: AisleValue | null; tag?: string; /** The store's label for the aisle ("Dairy and eggs"). */ label?: string }

const noTag: Category = { id: "", name: "No tag" }

/** The headings an item is under: one aisle, or each of its tags (an item with two tags shows under both). */
export function groupKeysOf(item: Item, store: Store | undefined, by: GroupBy): string[] {
  if (by === "tag") {
    const tags = tagsOf(item)
    return tags.length ? tags.map((t) => `t:${t}`) : ["t:"]
  }
  if (store?.noAisleNumbers) return ["az"]
  const a = itemAisle(item, store)
  return [a === null ? "none" : typeof a === "number" ? `n${a}` : `p${a.toLowerCase()}`]
}

function groupOf(key: string, item: Item, store: Store | undefined, categories: Category[]): Group {
  if (key === "az") return { key, title: "A to Z" }
  if (key.startsWith("t:")) {
    const id = key.slice(2)
    const tag = categories.find((c) => c.id === id) ?? noTag
    return { key, title: tag.name, tag: tag.id }
  }
  const a = itemAisle(item, store)
  return { key, title: aisleTitle(a), aisle: a, label: aisleLabel(store, a) }
}

/** Groups in order: aisles as the store is walked; tags A to Z with No tag last. */
function compareGroups(store: Store | undefined, a: Group, b: Group) {
  if (a.tag !== undefined || b.tag !== undefined) {
    if (a.tag === "") return 1
    if (b.tag === "") return -1
    return a.title.localeCompare(b.title)
  }
  return compareAisles(store, a.aisle ?? null, b.aisle ?? null)
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
        rows[id] = { need, got: 0, entries: item.entries, review: item.review, boughtAt: item.boughtAt, skipped: row.skipped }
        changed = true
      }
    }
  }
  for (const item of Object.values(items)) {
    if (rows[item.id]) continue
    const need = needOf(item)
    if (need > 0) {
      rows[item.id] = { need, got: 0, entries: item.entries, review: item.review, boughtAt: item.boughtAt }
      changed = true
    }
  }
  return changed ? { ...base, rows } : base
}

/** Today as an ISO date (local time), for bought dates. */
export const today = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`

/** Bought n more: stock goes up (a bulk item gains full packs), the list entries are settled by what came in, and the bought date is today. */
export function bought(i: Item, n: number): Item {
  if (n <= 0) return i
  const useBy = i.noExpiry ? i.useBy : [...(i.useBy ?? []), ...Array<null>(n).fill(null)]
  return normalise({ ...i, inStock: i.inStock + n, useBy, entries: settle(i.entries, n), boughtAt: today(), editedAt: new Date().toISOString() })
}

/** Un-ticked: takes back what was ticked, and puts the list entries, the New mark and the bought date back as they were. */
export function unbought(i: Item, n: number, entries: Item["entries"], review: boolean | undefined, boughtAt: string | undefined): Item {
  if (n <= 0) return i
  const inStock = Math.max(0, i.inStock - n)
  const dates = [...(i.useBy ?? [])]
  // The packs bought in this shop were added at the end, undated.
  dates.splice(Math.max(0, dates.length - n), n)
  return normalise({ ...i, inStock, useBy: dates, open: i.open === undefined ? undefined : Math.min(i.open, inStock), entries, review, boughtAt, editedAt: new Date().toISOString() })
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
  /** Skipped this shop: hidden from the list, still to buy another time (Batch 3, 24 Nov 2026). */
  skipped: boolean
}

/**
 * The list filters: why it's there and how much is left (as on the pantry app's shopping list), Show ordered items
 * (a switch, on unless `hideOrdered`; 26 Nov 2026, it replaced the Ordered stock filter), and Only items for this
 * store (Batch 3), which since 26 Nov 2026 shows only items set to this store: items for any store are hidden too.
 */
export type ListFilter = { show: "all" | "staples" | "recipes" | "added"; stock: "all" | "low" | "out"; hideOrdered?: boolean; thisStore?: boolean }
export const NO_FILTER: ListFilter = { show: "all", stock: "all" }

const FILTER_NAMES: Record<string, string> = { staples: "Staples", recipes: "For recipes", added: "Added", low: "Low", out: "Out" }

/** Low or Out. Anything else (an Ordered left from before 26 Nov 2026) is no stock filter. */
const stockOn = (f: ListFilter) => (f.stock === "low" || f.stock === "out" ? f.stock : null)

/** The filters that are on, by name: ["Staples", "Out"]. */
export const filterNames = (f: ListFilter | undefined) =>
  f ? [...[f.show, stockOn(f) ?? "all"].filter((v) => v !== "all").map((v) => FILTER_NAMES[v]), ...(f.hideOrdered ? ["No ordered"] : []), ...(f.thisStore ? ["This store"] : [])] : []

/** How many filters are on (0 to 4). */
export const filtersOn = (f: ListFilter | undefined) => (f ? Number(f.show !== "all") + Number(!!stockOn(f)) + Number(!!f.hideOrdered) + Number(!!f.thisStore) : 0)

/** Whether an item is for this store: no store chosen (every store), or this one. Where next uses this. */
export const forStore = (i: Item, storeId: string | undefined) => !storeId || i.where.length === 0 || i.where.includes(storeId)

/** Whether an item is set to this store (the This store filter): items for any store don't count. */
export const onlyAt = (i: Item, storeId: string | undefined) => !storeId || i.where.includes(storeId)

export const matchesFilter = (r: Row, f: ListFilter | undefined, storeId?: string) => {
  if (!f) return true
  const stock = stockOn(f)
  return (f.show === "all" || r.group === f.show) && (!stock || r.status === stock) && !(f.hideOrdered && r.ordered) && (!f.thisStore || onlyAt(r.item, storeId))
}

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
    const before = got > 0 ? unbought(item, got, r.entries, r.review, r.boughtAt) : item
    const group = shortfall(before) > 0 ? "staples" : before.entries?.[0]?.source.kind === "recipe" ? "recipes" : "added"
    const status = item.ordered ? "ordered" : stockOf(before)
    return [{ id, item, need: r.need, got, left, done, ordered: !!item.ordered, isNew: !!r.review, note, group, status, skipped: !!r.skipped && !done }]
  })
}

/** The rows on screen: not skipped this shop, and let through by the filters. */
export const shownRows = (state: Pick<PhoneState, "items" | "shop" | "filter" | "storeId">) =>
  rowsOf(state).filter((r) => !r.skipped && matchesFilter(r, state.filter, state.storeId))

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

export type GroupView = Group & { rows: Row[]; left: number; total: number }

/**
 * The list's headings that have something on it, in order, with their rows. By aisle, a tag's rows keep A to Z;
 * by tag, each tag's rows follow the walk round the store, so you can still shop one counter in aisle order.
 */
export function shopGroups(state: Pick<PhoneState, "items" | "shop" | "stores" | "categories" | "storeId" | "filter" | "groupBy">): GroupView[] {
  const store = state.stores.find((s) => s.id === state.storeId) ?? state.stores[0]
  const by: GroupBy = state.groupBy ?? "aisle"
  const groups = new Map<string, Group & { rows: Row[] }>()
  for (const r of shownRows(state)) {
    for (const key of groupKeysOf(r.item, store, by)) {
      const g = groups.get(key) ?? { ...groupOf(key, r.item, store, state.categories), rows: [] }
      g.rows.push(r)
      groups.set(key, g)
    }
  }
  const walk = (x: Row, y: Row) => compareAisles(store, itemAisle(x.item, store), itemAisle(y.item, store))
  return [...groups.values()]
    .sort((a, b) => compareGroups(store, a, b))
    .map((g) => {
      const rows = by === "tag" ? sortRows(g.rows).sort((x, y) => Number(x.done) - Number(y.done) || walk(x, y)) : sortRows(g.rows)
      return { ...g, rows, left: leftOf(rows), total: totalOf(rows) }
    })
}

/**
 * Whether ticking this item should ask for its aisle (Batch 4): the store has aisle numbers, the item has no
 * aisle there yet, and the setting is on.
 */
export function asksForAisle(state: Pick<PhoneState, "stores" | "storeId" | "noAislePrompt">, item: Item) {
  const store = state.stores.find((s) => s.id === state.storeId)
  return !!store && !store.noAisleNumbers && !state.noAislePrompt && itemAisle(item, store) === null
}

/** "Got all 6 eggs." */
export const gotAllText = (r: Row) => `Got all ${count(r.item, r.need)}${r.item.unit ? ` of ${r.item.name.toLowerCase()}` : ` ${r.item.name.toLowerCase()}`}.`

/** The item sheet's Got all popup (Isaac's design, 27 Nov 2026): "Got 2 bin bags", "Got 3 tins of tomatoes", "Got eggs". */
export const gotPopupText = (r: Row) => {
  const name = r.item.name.toLowerCase()
  if (r.need === 1) return `Got ${name}`
  return `Got ${count(r.item, r.need)}${r.item.unit ? ` of ${name}` : ` ${name}`}`
}

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

// ---------- shop done ----------

/** One store on the Shop done screen's "Where next?": the things still to get that it sells. */
export type NextStore = { store: Store; rows: Row[]; names: string }

/**
 * Where next (Shop done screen, 26 Nov 2026): the other stores, by how many of the things still to get (skipped
 * this shop) each one sells, most first. An item with no store chosen is for every store, as in the This store
 * filter. Stores that sell none of them are left out.
 */
export function whereNext(state: Pick<PhoneState, "items" | "shop" | "stores" | "storeId">): NextStore[] {
  const left = rowsOf(state).filter((r) => r.skipped)
  return state.stores
    .filter((s) => s.id !== state.storeId)
    .map((store) => {
      const rows = left.filter((r) => forStore(r.item, store.id)).sort((a, b) => a.item.name.localeCompare(b.item.name))
      const names = rows.map((r, k) => {
        const name = k === 0 ? r.item.name : r.item.name.toLowerCase()
        return r.left > 1 ? `${name} × ${r.left}` : name
      }).join(", ")
      return { store, rows, names }
    })
    .filter((n) => n.rows.length > 0)
    .sort((a, b) => b.rows.length - a.rows.length || a.store.name.localeCompare(b.store.name))
}

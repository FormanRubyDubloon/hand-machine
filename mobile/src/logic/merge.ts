// Merging the phone's items with Supabase's, field by field. Pure, so it's tested (test/merge.test.ts).
//
// Three copies of each item are compared: the phone's, the one at the last sync (`base`) and Supabase's.
// A field changed on one side only takes that side's value, so the phone changing stock and Collca on the
// web changing the notes both go through. A field changed on both sides to different values is a clash:
// the item keeps the phone's version, isn't sent, and the app asks which to keep (intent.md, "Syncing").
import { normalise, type Item, type Items } from "../../../prototypes/pantry-app/src/model"
import type { Conflict } from "../data/state"

/** Fields that aren't the item's own data: when it was edited or added. The chosen store (where) syncs since 21 Nov 2026. */
const IGNORED = new Set(["editedAt", "addedAt"])

/** Keys in order at every level, undefined dropped (as pantry-remote's sortKeys, without its Supabase import). */
function sortKeys(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortKeys)
  if (v && typeof v === "object") {
    return Object.fromEntries(Object.entries(v).filter(([, x]) => x !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => [k, sortKeys(x)]))
  }
  return v
}

const same = (a: unknown, b: unknown) => JSON.stringify(sortKeys(a ?? null)) === JSON.stringify(sortKeys(b ?? null))

/** An item's saved data as a string: equal strings mean nothing to sync. */
export const itemPrint = (i: Item | undefined) => {
  if (!i) return ""
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(i)) if (!IGNORED.has(k) && v !== undefined) out[k] = v
  return JSON.stringify(sortKeys(out))
}

export type ItemMerge = {
  /** The items as the phone should have them now. */
  items: Items
  /** Changed here (or merged): to upsert in Supabase. */
  push: Item[]
  /** Deleted here: to delete in Supabase. */
  remove: string[]
  /** Clashes, kept as the phone has them until you choose. */
  conflicts: Conflict[]
  /** How many came in from Supabase. */
  pulled: number
}

/** Field by field: one side's change wins; both sides changing a field differently is a clash. */
export function mergeFields(l: Item, b: Item, r: Item): { item: Item; clashes: string[] } {
  const keys = new Set([...Object.keys(l), ...Object.keys(b), ...Object.keys(r)].filter((k) => !IGNORED.has(k)))
  const out: Record<string, unknown> = { ...r }
  const clashes: string[] = []
  for (const k of keys) {
    const lv = (l as Record<string, unknown>)[k]
    const bv = (b as Record<string, unknown>)[k]
    const rv = (r as Record<string, unknown>)[k]
    if (same(lv, rv)) out[k] = rv
    else if (same(lv, bv)) out[k] = rv
    else if (same(rv, bv)) out[k] = lv
    else clashes.push(k)
  }
  // Dates and opened-on lists follow the stock: a stock clash is the clash, not three.
  if (clashes.includes("inStock")) for (const k of ["useBy", "openedAt"]) if (clashes.includes(k)) clashes.splice(clashes.indexOf(k), 1)
  // Stock, open packs and dates move together; normalise keeps them in step after a mix.
  const item = normalise({ ...(out as Item), editedAt: [l.editedAt ?? "", r.editedAt ?? ""].sort().pop() || undefined })
  return { item, clashes }
}

/**
 * Merges every item. `base` is null before the first sync: then Supabase's copy is taken as it is, and
 * nothing is deleted anywhere. `unresolved` are clashes already waiting for an answer: they stay as they are.
 */
export function mergeItems(localRaw: Items, baseRaw: Items | null, remoteRaw: Items): ItemMerge {
  // All three in the same normal form (dates and open packs in step), so only real changes differ.
  const norm = (all: Items): Items => Object.fromEntries(Object.entries(all).map(([id, i]) => [id, normalise(i)]))
  const remote = norm(remoteRaw)
  const local = norm(localRaw)
  const base = baseRaw ? norm(baseRaw) : null
  if (!base) return { items: remote, push: [], remove: [], conflicts: [], pulled: Object.keys(remote).length }

  const items: Items = {}
  const push: Item[] = []
  const remove: string[] = []
  const conflicts: Conflict[] = []
  let pulled = 0

  for (const id of new Set([...Object.keys(local), ...Object.keys(remote), ...Object.keys(base)])) {
    const l = local[id]
    const r = remote[id]
    const b = base[id]
    const lp = itemPrint(l)
    const rp = itemPrint(r)
    const bp = itemPrint(b)
    if (lp === rp) {
      if (l) items[id] = r ?? l
      continue
    }
    const localChanged = lp !== bp
    const remoteChanged = rp !== bp
    if (!localChanged) {
      // Only Supabase moved (or deleted it).
      if (r) items[id] = r
      pulled++
    } else if (!remoteChanged) {
      // Only the phone moved.
      if (l) {
        items[id] = l
        push.push(l)
      } else remove.push(id)
    } else if (l && r && b) {
      const { item, clashes } = mergeFields(l, b, r)
      if (clashes.length) {
        items[id] = l
        conflicts.push({ itemId: id, fields: clashes, remote: r, remoteAt: r.editedAt })
      } else {
        items[id] = item
        if (itemPrint(item) !== rp) push.push(item)
        else pulled++
      }
    } else if (l && r) {
      // New in both places with one id (rare): keep the phone's, but ask.
      items[id] = l
      conflicts.push({ itemId: id, fields: ["name"], remote: r, remoteAt: r.editedAt })
    } else if (l) {
      // Deleted elsewhere after it changed here: keep it, so a shop isn't lost.
      items[id] = l
      push.push(l)
    } else if (r) {
      // Deleted here after it changed elsewhere: keep the other side's change.
      items[id] = r
      pulled++
    }
  }
  return { items, push, remove, conflicts, pulled }
}

/** Labels for the fields a clash can be in, for the "changed in two places" question. */
export const FIELD_LABELS: Record<string, string> = {
  inStock: "stock", open: "open packs", target: "minimum", entries: "shopping list", name: "name", notes: "notes",
  categoryId: "tag", tagIds: "tags", aisleAt: "aisle", boughtAt: "bought date", location: "location", useBy: "use-by date", review: "New mark", ordered: "Ordered mark",
  price: "price", unit: "unit", type: "type", where: "store",
}

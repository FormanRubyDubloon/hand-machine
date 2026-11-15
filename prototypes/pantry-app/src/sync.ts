// Sync the pantry items, categories, stores (with their aisle numbers) and recipes with Supabase.
// Which store is the default stays on this computer.
//
// Three copies are compared per item: the one here, the one at the last sync (`base`) and the one
// in Supabase. Changed only here: pushed. Changed only in Supabase: pulled. Changed in both and
// different: the later edit wins, and the sync says how many that was.
import {
  deleteRecipes, deleteStores, fetchCategories, fetchRecipeRows, toRecipe, writeRecipes, fetchRemote, fetchHistory, fetchStores, fingerprint, sortKeys, writeHistory, upsertCategories, writeRemote, writeStores, type CategoryRow, type HistoryRow,
} from "../../shared/src/pantry-remote"
import { normalise, type Category, type HistoryEntry, type Item, type Items, type Recipe, type Store } from "./model"

export { fingerprint }

/** The items that differ from the last sync (or, before the first sync, from nothing). */
export function pendingIds(items: Items, base: Items | undefined): string[] {
  if (!base) return []
  const ids = new Set([...Object.keys(items), ...Object.keys(base)])
  return [...ids].filter((id) => fingerprint(items[id]) !== fingerprint(base[id]))
}

export type SyncResult = {
  items: Items
  pushed: number
  pulled: number
  /** Changed in both places; the later edit won. */
  clashes: number
  /** Items whose aisle only exists on this computer, saved without one. */
  uncategorised: number
}

/**
 * Runs one sync. `base` is the items as they were at the last sync; without one (the first sync)
 * nothing is deleted anywhere, because a missing item can't be told from one never seen.
 * Throws with Supabase's message if a read or write fails; nothing here is half-applied locally.
 */
export async function syncItems(local: Items, base: Items | undefined): Promise<SyncResult> {
  const fetched = await fetchRemote()
  const remote: Items = Object.fromEntries(Object.entries(fetched.items).map(([id, i]) => [id, normalise(i)]))
  const known = fetched.categories
  const first = !base
  const was = base ?? remote

  const merged: Items = {}
  const push: Item[] = []
  const remove: string[] = []
  let pulled = 0
  let clashes = 0

  for (const id of new Set([...Object.keys(local), ...Object.keys(remote), ...Object.keys(was)])) {
    const l = local[id]
    const r = remote[id]
    const b = was[id]
    const localChanged = fingerprint(l) !== fingerprint(b)
    const remoteChanged = fingerprint(r) !== fingerprint(b)
    if (fingerprint(l) === fingerprint(r)) {
      if (l) merged[id] = l
      continue
    }
    if (!localChanged) {
      // Only Supabase moved (or deleted it).
      if (r) merged[id] = r
      pulled++
    } else if (!remoteChanged) {
      // Only this computer moved.
      if (l) {
        merged[id] = l
        push.push(l)
      } else if (!first) remove.push(id)
      else if (r) merged[id] = r
    } else {
      clashes++
      const localWins = !r || (l && (l.editedAt ?? "") >= (r.editedAt ?? ""))
      if (localWins && l) {
        merged[id] = l
        push.push(l)
      } else if (!localWins && r) merged[id] = r
      else if (!l) remove.push(id)
    }
  }

  const uncategorised = push.filter((i) => i.categoryId && !known.has(i.categoryId)).length
  // Keep what Supabase will hand back next time, so the next sync doesn't see a phantom change.
  const back = await writeRemote(push, remove, known)
  for (const [id, item] of Object.entries(back)) merged[id] = normalise({ ...item, where: merged[id].where })
  // The added date only ever comes from Supabase (created_at), so items saved here before it existed pick it up now.
  for (const [id, item] of Object.entries(merged)) if (!item.addedAt && remote[id]?.addedAt) merged[id] = { ...item, addedAt: remote[id].addedAt }
  return { items: merged, pushed: push.length + remove.length, pulled, clashes, uncategorised }
}

// ---------- categories ----------

const nameOf = (c: Category | undefined) => c?.name ?? ""

/** The categories that differ from the last sync. */
export function pendingCategoryIds(local: Category[], base: Category[] | undefined): string[] {
  if (!base) return []
  const l = Object.fromEntries(local.map((c) => [c.id, c]))
  const b = Object.fromEntries(base.map((c) => [c.id, c]))
  return [...new Set([...Object.keys(l), ...Object.keys(b)])].filter((id) => nameOf(l[id]) !== nameOf(b[id]))
}

export type CategorySync = {
  /** The categories as they should be here now: this computer's order, new ones from Supabase at the end. */
  categories: Category[]
  /** Removed here. Deleted from Supabase only after the items have moved off them. */
  remove: string[]
  pushed: number
  pulled: number
}

/**
 * The first half of a sync: merges the categories by id, the same three-way way as items, and sends
 * the added and renamed ones before the items go (so an item in a new category keeps it). A
 * category renamed in both places keeps this computer's name: there's no edit time to compare.
 */
export async function syncCategories(local: Category[], base: Category[] | undefined): Promise<CategorySync> {
  const remoteRows = await fetchCategories()
  const remote = Object.fromEntries(remoteRows.map((r) => [r.id, { id: r.id, name: r.name }]))
  const here = Object.fromEntries(local.map((c) => [c.id, c]))
  const was = Object.fromEntries((base ?? remoteRows).map((c) => [c.id, { id: c.id, name: c.name }]))
  const first = !base

  const keep = new Set<string>()
  const names: Record<string, string> = {}
  const push: Category[] = []
  const remove: string[] = []
  let pulled = 0

  for (const id of new Set([...Object.keys(here), ...Object.keys(remote), ...Object.keys(was)])) {
    const l = here[id]
    const r = remote[id]
    const b = was[id]
    if (nameOf(l) === nameOf(r)) {
      if (l) keep.add(id)
      continue
    }
    const localChanged = nameOf(l) !== nameOf(b)
    if (!localChanged) {
      // Only Supabase moved: take its name, or drop it here if it was deleted there.
      if (r) {
        keep.add(id)
        names[id] = r.name
      }
      pulled++
    } else if (l) {
      keep.add(id)
      push.push(l)
    } else if (!first) remove.push(id)
    else if (r) {
      keep.add(id)
      names[id] = r.name
    }
  }

  const sorts = Object.fromEntries(remoteRows.map((r) => [r.id, r.sort]))
  let next = Math.max(-1, ...remoteRows.map((r) => r.sort))
  const rows: CategoryRow[] = push.map((c) => ({ id: c.id, name: c.name, sort: sorts[c.id] ?? ++next }))
  await upsertCategories(rows)

  const categories = [
    ...local.filter((c) => keep.has(c.id)).map((c) => (names[c.id] ? { ...c, name: names[c.id] } : c)),
    ...remoteRows.filter((r) => keep.has(r.id) && !here[r.id]).map((r) => ({ id: r.id, name: names[r.id] ?? r.name })),
  ]
  return { categories, remove, pushed: push.length + remove.length, pulled }
}

// ---------- stores ----------

/** What counts as a change to a store: its name, kind, place and aisle numbers (no number = no entry). */
export function storeFingerprint(x: Store | undefined): string {
  if (!x) return ""
  const aisles = Object.entries(x.aisles).filter(([, n]) => n != null).sort(([a], [b]) => a.localeCompare(b))
  return JSON.stringify([x.name, x.kind ?? "", x.place ?? "", aisles])
}

/** The stores that differ from the last sync. */
export function pendingStoreIds(local: Store[], base: Store[] | undefined): string[] {
  if (!base) return []
  const l = Object.fromEntries(local.map((x) => [x.id, x]))
  const b = Object.fromEntries(base.map((x) => [x.id, x]))
  return [...new Set([...Object.keys(l), ...Object.keys(b)])].filter((id) => storeFingerprint(l[id]) !== storeFingerprint(b[id]))
}

export type StoreSync = { stores: Store[]; pushed: number; pulled: number }

/**
 * Merges the stores by id, the same three-way way as categories, with a store and its aisle numbers
 * as one unit: a store changed in both places keeps this computer's version. Sends the changes and
 * deletions straight away. Runs after the categories have gone, so new categories can be numbered.
 * `categories` are the ids Supabase has after that; aisle numbers for any other are dropped.
 */
export async function syncStores(local: Store[], base: Store[] | undefined, categories: Category[]): Promise<StoreSync> {
  const known = new Set(categories.map((c) => c.id))
  const trim = (x: Store): Store => ({ ...x, aisles: Object.fromEntries(Object.entries(x.aisles).filter(([id]) => known.has(id))) })
  const remoteList = await fetchStores()
  const remote = Object.fromEntries(remoteList.map((x) => [x.id, x]))
  const here = Object.fromEntries(local.map((x) => [x.id, trim(x)]))
  const was = Object.fromEntries((base ?? remoteList).map((x) => [x.id, trim(x)]))
  const first = !base

  const merged: Record<string, Store> = {}
  const push: Store[] = []
  const remove: string[] = []
  let pulled = 0

  for (const id of new Set([...Object.keys(here), ...Object.keys(remote), ...Object.keys(was)])) {
    const l = here[id]
    const r = remote[id]
    const b = was[id]
    if (storeFingerprint(l) === storeFingerprint(r)) {
      if (l) merged[id] = l
      continue
    }
    if (storeFingerprint(l) === storeFingerprint(b)) {
      if (r) merged[id] = r
      pulled++
    } else if (l) {
      merged[id] = l
      push.push(l)
    } else if (!first) remove.push(id)
    else if (r) merged[id] = r
  }

  // This computer's order, then stores that only Supabase has, in its order.
  const order = [...local.map((x) => x.id), ...remoteList.map((x) => x.id).filter((id) => !here[id])].filter((id) => merged[id])
  await writeStores(push, (id) => order.indexOf(id), known)
  await deleteStores(remove)
  return { stores: order.map((id) => merged[id]), pushed: push.length + remove.length, pulled }
}

// ---------- recipes ----------

const iso = (t: string | null | undefined) => (t ? new Date(t).toISOString() : null)

/**
 * What counts as a change to a recipe: everything Supabase keeps, written the same way on both
 * sides (no time is 0, a missing note is "", a time is compared as an instant).
 */
export function recipeFingerprint(r: Recipe | undefined): string {
  if (!r) return ""
  return JSON.stringify([
    r.name, r.minutes || 0, r.serves, !!r.wantToCook, r.soon ?? "",
    r.ingredients.map((g) => [g.text, g.itemId || "", g.need, g.buy, !!g.partial, g.uses ?? null]),
    r.method, r.prep ?? null, r.cook ?? null, r.tags ?? [], r.meal ?? null, r.source ?? "", r.notes ?? "",
    iso(r.lastCooked), r.addedBy ?? "you", iso(r.addedAt),
  ])
}

/** The recipes that differ from the last sync. */
export function pendingRecipeIds(local: Recipe[], base: Recipe[] | undefined): string[] {
  if (!base) return []
  const l = Object.fromEntries(local.map((r) => [r.id, r]))
  const b = Object.fromEntries(base.map((r) => [r.id, r]))
  return [...new Set([...Object.keys(l), ...Object.keys(b)])].filter((id) => recipeFingerprint(l[id]) !== recipeFingerprint(b[id]))
}

export type RecipeSync = { recipes: Recipe[]; pushed: number; pulled: number }

/**
 * Merges the recipes by id, the same three-way way as stores: a recipe changed in both places keeps
 * this computer's version. Runs after the items, so `items` (the ids Supabase has) are the ones an
 * ingredient can link to. What was sent is read back, so the next sync doesn't see a phantom change.
 */
export async function syncRecipes(local: Recipe[], base: Recipe[] | undefined, items: Set<string>): Promise<RecipeSync> {
  const rows = await fetchRecipeRows()
  const remote = Object.fromEntries(Object.entries(rows).map(([id, r]) => [id, toRecipe(r)]))
  const here = Object.fromEntries(local.map((r) => [r.id, r]))
  const was = base ? Object.fromEntries(base.map((r) => [r.id, r])) : remote
  const first = !base

  const merged: Record<string, Recipe> = {}
  const push: Recipe[] = []
  const remove: string[] = []
  let pulled = 0

  for (const id of new Set([...Object.keys(here), ...Object.keys(remote), ...Object.keys(was)])) {
    const l = here[id]
    const r = remote[id]
    const b = was[id]
    if (recipeFingerprint(l) === recipeFingerprint(r)) {
      if (l) merged[id] = l
      continue
    }
    if (recipeFingerprint(l) === recipeFingerprint(b)) {
      if (r) merged[id] = r
      pulled++
    } else if (l) {
      merged[id] = l
      push.push(l)
    } else if (!first) remove.push(id)
    else if (r) merged[id] = r
  }

  await writeRecipes(push, rows, items)
  await deleteRecipes(remove)
  if (push.length) {
    const back = await fetchRecipeRows(push.map((r) => r.id))
    for (const [id, row] of Object.entries(back)) merged[id] = toRecipe(row)
  }
  // Edit dates come from Supabase, so recipes saved here before the column existed pick theirs up now.
  for (const [id, r] of Object.entries(merged)) if (!r.editedAt && remote[id]?.editedAt) merged[id] = { ...r, editedAt: remote[id].editedAt }
  // This computer's order, then recipes only Supabase has (by name).
  const order = [...local.map((r) => r.id), ...Object.keys(rows).filter((id) => !here[id])].filter((id) => merged[id])
  return { recipes: order.map((id) => merged[id]), pushed: push.length + remove.length, pulled }
}

// ---------- history ----------

/** What counts as a change to a History entry: all of it, written the same way on both sides. */
export function historyFingerprint(h: HistoryEntry | undefined): string {
  if (!h) return ""
  return JSON.stringify([
    iso(h.at), h.who, h.title, h.detail ?? "", h.itemIds ?? [], h.recipeId ?? "", !!h.undone, h.key ?? "", sortKeys(h.undo ?? null),
  ])
}

const toHistory = (r: HistoryRow): HistoryEntry => ({
  id: r.id, at: new Date(r.at).toISOString(), who: r.who, title: r.title,
  detail: r.detail ?? undefined,
  itemIds: r.item_ids.length ? r.item_ids : undefined,
  recipeId: r.recipe_id ?? undefined,
  undo: (r.undo as HistoryEntry["undo"]) ?? undefined,
  undone: r.undone || undefined,
  key: r.key ?? undefined,
})

const toHistoryRow = (h: HistoryEntry): HistoryRow => ({
  id: h.id, at: h.at, who: h.who, title: h.title, detail: h.detail ?? null, item_ids: h.itemIds ?? [],
  recipe_id: h.recipeId ?? null, undo: h.undo ?? null, undone: !!h.undone, key: h.key ?? null,
})

/** The History entries that differ from the last sync. `base` maps entry id to its fingerprint then. */
export function pendingHistoryIds(local: HistoryEntry[], base: Record<string, string> | undefined): string[] {
  if (!base) return []
  return local.filter((h) => base[h.id] !== historyFingerprint(h)).map((h) => h.id)
}

export type HistorySync = { history: HistoryEntry[]; base: Record<string, string>; pushed: number; pulled: number }

/**
 * Merges History by id. New entries go up, entries only Supabase has come down. An entry that
 * changed here (a merged stepper tap, or undone) is sent; one changed only in Supabase is taken.
 * Undone wins either way, so an undo is never lost. Entries removed in Supabase since the last
 * sync are dropped here. Only the newest 500 come back.
 */
export async function syncHistory(local: HistoryEntry[], base: Record<string, string> | undefined): Promise<HistorySync> {
  const remote = Object.fromEntries((await fetchHistory()).map((r) => [r.id, toHistory(r)]))
  const here = Object.fromEntries(local.map((h) => [h.id, h]))
  const merged: Record<string, HistoryEntry> = {}
  const push: HistoryEntry[] = []
  let pulled = 0
  for (const id of new Set([...Object.keys(here), ...Object.keys(remote)])) {
    const l = here[id]
    const r = remote[id]
    if (l && r) {
      if (historyFingerprint(l) === historyFingerprint(r)) merged[id] = l
      else if (base && base[id] === historyFingerprint(l)) {
        merged[id] = r
        pulled++
      } else {
        merged[id] = { ...l, undone: l.undone || r.undone || undefined }
        push.push(merged[id])
      }
    } else if (l) {
      if (base && id in base) continue
      merged[id] = l
      push.push(l)
    } else {
      merged[id] = r
      pulled++
    }
  }
  await writeHistory(push.map(toHistoryRow))
  const history = Object.values(merged).sort((a, b) => b.at.localeCompare(a.at))
  return { history, base: Object.fromEntries(history.map((h) => [h.id, historyFingerprint(h)])), pushed: push.length, pulled }
}

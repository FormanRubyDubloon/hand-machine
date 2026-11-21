// One sync with Supabase. The store (store.tsx) runs it by itself: shortly after any change, when the app comes
// back to the front, when signal returns, when Collca on the web or Claude changes something (Realtime), and
// every couple of minutes while the app is open. There's no Sync button.
//
// Categories, stores and recipes use the desktop app's own three-way merges (prototypes/pantry-app/src/sync.ts),
// so the phone and Collca on the web agree on what a change is. Items use a field-by-field merge
// (src/logic/merge.ts), so a real clash can be put to you instead of the later edit quietly winning.
import { fetchRemote, writeHistory, writeRemote, type HistoryRow } from "../../../prototypes/shared/src/pantry-remote"
import { syncCategories, syncRecipes, syncStores } from "../../../prototypes/pantry-app/src/sync"
import { normalise } from "../../../prototypes/pantry-app/src/model"
import { mergeFields, mergeItems } from "../logic/merge"
import type { Conflict, HistoryEntry, Items, PhoneState, Synced } from "./state"

export type SyncOutcome = {
  next: Synced & { conflicts: Conflict[] }
  /** What Supabase now has, as the base for the next sync. */
  synced: Synced
  /** History entries that went up. */
  sentHistory: string[]
  pulled: number
  pushed: number
}

const toRow = (h: HistoryEntry): HistoryRow => ({
  id: h.id, at: h.at, who: h.who, title: h.title, detail: h.detail ?? null, item_ids: h.itemIds ?? [],
  recipe_id: h.recipeId ?? null, undo: h.undo ?? null, undone: !!h.undone, redo: h.redo ?? null, key: h.key ?? null,
})

/** True when Supabase couldn't be reached at all, as opposed to it saying no. */
export const isNetworkError = (e: unknown) =>
  e instanceof Error && /network|failed to fetch|load failed|timed out|timeout|offline|internet connection|aborted/i.test(e.message)

export async function runSync(s: PhoneState): Promise<SyncOutcome> {
  const base = s.synced

  // Categories first, so an item in an aisle added on the phone keeps it. The phone never removes categories.
  const cats = await syncCategories(s.categories, base?.categories)
  const stores = await syncStores(s.stores, base?.stores, cats.categories)

  // Items: clashes wait for an answer and aren't sent.
  const fetched = await fetchRemote()
  const merge = mergeItems(s.items, base?.items ?? null, fetched.items)
  const back = await writeRemote(merge.push, merge.remove, fetched.categories)
  const items: Items = { ...merge.items }
  for (const [id, item] of Object.entries(back)) items[id] = item
  const syncedItems: Items = { ...items }
  for (const c of merge.conflicts) {
    if (base?.items[c.itemId]) syncedItems[c.itemId] = base.items[c.itemId]
    else delete syncedItems[c.itemId]
  }

  const recipes = await syncRecipes(s.recipes, base?.recipes, new Set(Object.keys(items)))

  // The phone's changes go to Collca's History, marked "phone", so they can be undone there today.
  await writeHistory(s.outbox.map(toRow))

  const synced: Synced = { items: syncedItems, categories: cats.categories, stores: stores.stores, recipes: recipes.recipes }
  return {
    next: { items, categories: cats.categories, stores: stores.stores, recipes: recipes.recipes, conflicts: merge.conflicts },
    synced,
    sentHistory: s.outbox.map((h) => h.id),
    pulled: merge.pulled + cats.pulled + stores.pulled + recipes.pulled,
    pushed: merge.push.length + merge.remove.length + cats.pushed + stores.pushed + recipes.pushed,
  }
}

// ---------- applying a sync to a state that may have moved on ----------

type ById<T> = Record<string, T>
const byId = <T extends { id: string }>(list: T[]): ById<T> => Object.fromEntries(list.map((x) => [x.id, x]))
const print = (v: unknown) => JSON.stringify(v ?? null)

/**
 * The sync ran on a snapshot (`sent`). Anything you changed while it ran is kept as you left it; it differs
 * from the new base, so it goes in the next sync. Everything else takes the sync's result.
 */
function rebase<T>(current: ById<T>, sent: ById<T>, result: ById<T>): ById<T> {
  const out: ById<T> = {}
  for (const id of new Set([...Object.keys(current), ...Object.keys(result), ...Object.keys(sent)])) {
    const touched = print(current[id]) !== print(sent[id])
    const pick = touched ? current[id] : result[id]
    if (pick !== undefined) out[id] = pick
  }
  return out
}

/** Keeps `order` (the result's order), with anything only `current` has at the end. */
const ordered = <T extends { id: string }>(map: ById<T>, order: T[], current: T[]) =>
  [...order.map((x) => x.id), ...current.map((x) => x.id)].filter((id, k, all) => all.indexOf(id) === k && map[id]).map((id) => map[id])

/** Items changed during the sync keep your changes on top of the sync's result, field by field. */
function rebaseItems(current: Items, sent: Items, result: Items): Items {
  const out = rebase(current, sent, result)
  for (const id of Object.keys(out)) {
    const c = current[id]
    const s = sent[id]
    const r = result[id]
    if (!c || !s || !r || print(c) === print(s)) continue
    const { item, clashes } = mergeFields(c, s, r)
    // Where both moved the same field, what you just did wins: it's newer than the sync.
    out[id] = clashes.length ? normalise({ ...item, ...Object.fromEntries(clashes.map((k) => [k, (c as Record<string, unknown>)[k]])) }) : item
  }
  return out
}

export function applySync(current: PhoneState, sent: PhoneState, o: SyncOutcome): PhoneState {
  const items = rebaseItems(current.items, sent.items, o.next.items)
  const categories = ordered(rebase(byId(current.categories), byId(sent.categories), byId(o.next.categories)), o.next.categories, current.categories)
  const stores = ordered(rebase(byId(current.stores), byId(sent.stores), byId(o.next.stores)), o.next.stores, current.stores)
  const recipes = ordered(rebase(byId(current.recipes), byId(sent.recipes), byId(o.next.recipes)), o.next.recipes, current.recipes)
  const sentIds = new Set(o.sentHistory)
  // A clash you've already answered since the sync started stays answered.
  const answered = new Set(sent.conflicts.map((c) => c.itemId).filter((id) => !current.conflicts.some((c) => c.itemId === id)))
  const conflicts = o.next.conflicts.filter((c) => !answered.has(c.itemId))
  const storeId = stores.some((x) => x.id === current.storeId) ? current.storeId : (stores[0]?.id ?? "")
  return {
    ...current,
    items, categories, stores, recipes, conflicts, storeId,
    synced: o.synced,
    outbox: current.outbox.filter((h) => !sentIds.has(h.id)),
    syncedAt: new Date().toISOString(),
  }
}

/** How many things on the phone differ from Supabase's copy at the last sync. */
export function pendingCount(s: PhoneState) {
  if (!s.synced) return 0
  const diff = <T extends { id: string }>(a: T[], b: T[]) => {
    const x = byId(a)
    const y = byId(b)
    return [...new Set([...Object.keys(x), ...Object.keys(y)])].filter((id) => print(x[id]) !== print(y[id])).length
  }
  const items = [...new Set([...Object.keys(s.items), ...Object.keys(s.synced.items)])].filter((id) => print(s.items[id]) !== print(s.synced!.items[id])).length
  return items + diff(s.categories, s.synced.categories) + diff(s.stores, s.synced.stores) + diff(s.recipes, s.synced.recipes)
}

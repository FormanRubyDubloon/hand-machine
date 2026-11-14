// The pantry the shopping app syncs with: the `items` table in Supabase. Stores, aisles and recipes
// still come from localStorage, shared with the pantry app prototype (prototypes/pantry-app), which
// only works when both run in the same browser; on its own the phone uses the seed for those.
//
// `loadRemote` fetches the items once per sync and keeps them here, so the sync code can read them
// synchronously. `pushRemote` writes the merged result back. Both need signal; a failure to reach
// Supabase is treated like having no signal.
import { DB_KEY, readJson, seedCategories, seedRecipes, seedStores, writeJson, type SharedDb } from "../../shared/src/pantry"
import { fetchRemote, fingerprint, isNetworkError, writeRemote } from "../../shared/src/pantry-remote"
import type { Items } from "./model"

let remote: Items | null = null
let categories = new Set<string>()

/** Fetches the pantry's items. Throws if Supabase can't be reached or refuses the read. */
export async function loadRemote(): Promise<Items> {
  const fetched = await fetchRemote()
  remote = fetched.items
  categories = fetched.categories
  return remote
}

/** The items as last fetched. Empty until the first `loadRemote`. */
export function readRemote(): Items {
  return remote ?? {}
}

/** Sends what differs from the pantry's copy (as fetched at the start of this sync). Throws if refused. */
export async function pushRemote(merged: Items): Promise<void> {
  const before = remote ?? {}
  const changed = Object.values(merged).filter((i) => fingerprint(i) !== fingerprint(before[i.id]))
  const back = await writeRemote(changed, [], categories)
  remote = { ...merged, ...back }
}

export { isNetworkError }

/** Stores, aisles and recipes from the pantry app. Falls back to the seed if the pantry app hasn't run yet. */
export function readShared(): SharedDb {
  const db = readJson<Partial<SharedDb>>(DB_KEY)
  return {
    categories: db?.categories ?? seedCategories,
    stores: db?.stores ?? seedStores,
    recipes: db?.recipes ?? seedRecipes,
  }
}

/** Sends the phone's stores to the pantry, keeping everything else the pantry app stores alongside them. */
export function writeSharedStores(stores: SharedDb["stores"]) {
  const db = readJson<Record<string, unknown>>(DB_KEY) ?? { categories: seedCategories, recipes: seedRecipes }
  writeJson(DB_KEY, { ...db, stores })
}

export function resetRemote() {
  remote = null
}

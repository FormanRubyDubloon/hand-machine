// The pantry the shopping app syncs with: items, categories, stores and aisle numbers in Supabase.
// Recipes still come from localStorage, shared with the pantry app prototype (prototypes/pantry-app),
// which only works when both run in the same browser; on its own the phone uses the seed for those.
//
// `loadRemote` fetches the items, categories and stores once per sync and keeps them here, so the
// sync code can read them synchronously. `pushRemote` writes the merged items back and
// `pushStores` the stores. Both need signal; a failure to reach
// Supabase is treated like having no signal.
import { DB_KEY, readJson, seedCategories, seedRecipes, seedStores, writeJson, type SharedDb } from "../../shared/src/pantry"
import { deleteStores, fetchCategories, fetchRemote, fetchStores, fingerprint, isNetworkError, writeRemote, writeStores } from "../../shared/src/pantry-remote"
import { normStore, type Items, type Store } from "./model"

let remote: Items | null = null
let categories = new Set<string>()
let remoteCategories: { id: string; name: string }[] = []
let remoteStores: Store[] = []

/** Fetches the pantry's items. Throws if Supabase can't be reached or refuses the read. */
export async function loadRemote(): Promise<Items> {
  const [fetched, cats, stores] = await Promise.all([fetchRemote(), fetchCategories(), fetchStores()])
  remote = fetched.items
  categories = fetched.categories
  remoteCategories = cats.map((c) => ({ id: c.id, name: c.name }))
  remoteStores = stores.map(normStore)
  return remote
}

/** The categories as last fetched, in the pantry's order. */
export const readRemoteCategories = () => remoteCategories

/** The stores and their aisle numbers as last fetched. */
export const readRemoteStores = () => remoteStores

/** Sends changed and new stores, and deletes the ones removed on the phone. Throws if refused. */
export async function pushStores(merged: Store[]): Promise<void> {
  const before = new Map(remoteStores.map((x) => [x.id, JSON.stringify(x)]))
  const changed = merged.filter((x) => before.get(x.id) !== JSON.stringify(normStore(x)))
  const removed = remoteStores.filter((x) => !merged.some((m) => m.id === x.id)).map((x) => x.id)
  const order = new Map(merged.map((x, i) => [x.id, i]))
  await writeStores(changed, (id) => order.get(id) ?? 0, categories)
  await deleteStores(removed)
  remoteStores = merged.map(normStore)
}

/** The items as last fetched. Empty until the first `loadRemote`. */
export function readRemote(): Items {
  return remote ?? {}
}

/** Sends what differs from the pantry's copy (as fetched at the start of this sync). Throws if refused. */
export async function pushRemote(merged: Items): Promise<void> {
  const before = remote ?? {}
  const changed = Object.values(merged).filter((i) => fingerprint(i) !== fingerprint(before[i.id]))
  // Items the pantry already has are sent as stock and entries only; the rest of the row stays the pantry's.
  const back = await writeRemote(changed, [], categories, new Set(changed.filter((i) => before[i.id]).map((i) => i.id)))
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

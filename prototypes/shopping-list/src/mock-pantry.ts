// A stand-in for the pantry the shopping app syncs with. It lives in localStorage, shared with the
// pantry app prototype (prototypes/pantry-app): changes made there or "by Claude" show up here at the
// next sync. Swap this file for real API calls (through a small server) in the next pass.
import { DB_KEY, ITEMS_KEY, readJson, seedCategories, seedRecipes, seedStores, writeJson, type SharedDb } from "../../shared/src/pantry"
import { seedRemote, type Items } from "./model"

export function readRemote(): Items {
  const stored = readJson<Items>(ITEMS_KEY)
  if (stored) return stored
  const seeded = seedRemote()
  writeRemote(seeded)
  return seeded
}

export function writeRemote(items: Items) {
  writeJson(ITEMS_KEY, items)
}

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
  try {
    localStorage.removeItem(ITEMS_KEY)
  } catch {
    /* ignore */
  }
}

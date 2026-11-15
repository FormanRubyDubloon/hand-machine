// A pantry in memory, for the tests: the same Backend as Supabase, without the network.
import type { Backend, HistoryRow, PantryData } from "../src/backend"
import type { SharedItem, SharedRecipe } from "../../shared/src/pantry"

export function memoryBackend(seed: PantryData) {
  const state = structuredClone(seed)
  const history: HistoryRow[] = []
  const backend: Backend = {
    async load() {
      return structuredClone(state)
    },
    async saveItems(items: SharedItem[]) {
      for (const i of items) state.items[i.id] = structuredClone(i)
    },
    async deleteItems(ids) {
      for (const id of ids) delete state.items[id]
      // As the foreign key does: recipe_ingredients.item_id on delete set null.
      for (const r of state.recipes) r.ingredients = r.ingredients.map((g) => (ids.includes(g.itemId) ? { ...g, itemId: "" } : g))
    },
    async saveRecipes(recipes: SharedRecipe[]) {
      for (const r of recipes) {
        const n = state.recipes.findIndex((x) => x.id === r.id)
        if (n >= 0) state.recipes[n] = structuredClone(r)
        else state.recipes.push(structuredClone(r))
      }
    },
    async deleteRecipes(ids) {
      state.recipes = state.recipes.filter((r) => !ids.includes(r.id))
    },
    async saveStores(stores, sort) {
      for (const x of stores) {
        const n = state.stores.findIndex((y) => y.id === x.id)
        if (n >= 0) state.stores[n] = structuredClone(x)
        else state.stores.push(structuredClone(x))
      }
      state.stores.sort((a, b) => sort(a.id) - sort(b.id))
    },
    async deleteStores(ids) {
      state.stores = state.stores.filter((x) => !ids.includes(x.id))
    },
    async addHistory(row) {
      history.unshift(row)
    },
    async history(limit) {
      return history.slice(0, limit)
    },
  }
  return { backend, state, history }
}

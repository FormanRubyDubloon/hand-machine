// Where the Claude connection reads and writes the pantry: Supabase, as the signed-in user, so the
// same row-level security applies to Claude as to the apps. Tests use the in-memory version in
// test/memory-backend.ts instead.
import type { SupabaseClient } from "@supabase/supabase-js"
import { ITEM_SELECT, recipeRows, toEntryRow, toItem, toRecipe, toRow, type RecipeRow, type Row } from "../../shared/src/rows"
import type { Category, SharedItem, SharedRecipe, SharedStore } from "../../shared/src/pantry"
import type { HistoryRow } from "../../shared/src/pantry-remote"

export type { HistoryRow }

export type PantryData = {
  items: Record<string, SharedItem>
  recipes: SharedRecipe[]
  /** The recipes as Supabase has them, so a save keeps the columns the app doesn't have. */
  recipeRows: Record<string, RecipeRow>
  categories: Category[]
  stores: SharedStore[]
}

export interface Backend {
  load(): Promise<PantryData>
  /** Upserts items and replaces their list entries. */
  saveItems(items: SharedItem[], categories: Set<string>): Promise<void>
  deleteItems(ids: string[]): Promise<void>
  saveRecipes(recipes: SharedRecipe[], before: Record<string, RecipeRow>, items: Set<string>): Promise<void>
  deleteRecipes(ids: string[]): Promise<void>
  /** Upserts stores and replaces their aisle numbers. `sort` gives each store's place in the list. */
  saveStores(stores: SharedStore[], sort: (id: string) => number, categories: Set<string>): Promise<void>
  /** Deletes stores; their aisle numbers go with them. */
  deleteStores(ids: string[]): Promise<void>
  addHistory(row: HistoryRow): Promise<void>
  history(limit: number): Promise<HistoryRow[]>
}

const RECIPE_SELECT = "*, recipe_ingredients(position, text, group_name, item_id, need, buy, partial, optional, uses)"

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data as T
}

export function supabaseBackend(db: SupabaseClient): Backend {
  return {
    async load() {
      const [items, recipes, categories, stores, aisles] = await Promise.all([
        db.from("items").select(ITEM_SELECT).order("name"),
        db.from("recipes").select(RECIPE_SELECT).order("name"),
        db.from("categories").select("id, name, sort").order("sort"),
        db.from("stores").select("id, name, kind, place, sort").order("sort"),
        db.from("store_aisles").select("store_id, category_id, number"),
      ])
      const rows = check(recipes) as RecipeRow[]
      const numbers = check(aisles) as { store_id: string; category_id: string; number: number }[]
      return {
        items: Object.fromEntries((check(items) as Row[]).map((r) => [r.id, toItem(r)])),
        recipes: rows.map(toRecipe),
        recipeRows: Object.fromEntries(rows.map((r) => [r.id, r])),
        categories: (check(categories) as Category[]).map(({ id, name }) => ({ id, name })),
        stores: (check(stores) as { id: string; name: string; kind: string | null; place: string | null }[]).map((s) => ({
          id: s.id,
          name: s.name,
          kind: s.kind ?? "",
          place: s.place ?? "",
          aisles: Object.fromEntries(numbers.filter((a) => a.store_id === s.id).map((a) => [a.category_id, a.number])),
        })),
      }
    },

    async saveItems(items, categories) {
      if (!items.length) return
      check(await db.from("items").upsert(items.map((i) => toRow(i, categories)), { onConflict: "id" }))
      const ids = items.map((i) => i.id)
      check(await db.from("list_entries").delete().in("item_id", ids))
      const entries = items.flatMap((i) => (i.entries ?? []).map((e, n) => ({ item_id: i.id, ...toEntryRow(e, n) })))
      if (entries.length) check(await db.from("list_entries").insert(entries))
    },

    async deleteItems(ids) {
      if (ids.length) check(await db.from("items").delete().in("id", ids))
    },

    async saveRecipes(recipes, before, items) {
      if (!recipes.length) return
      const { rows, lines } = recipeRows(recipes, before, items)
      check(await db.from("recipes").upsert(rows, { onConflict: "id" }))
      check(await db.from("recipe_ingredients").delete().in("recipe_id", recipes.map((r) => r.id)))
      if (lines.length) check(await db.from("recipe_ingredients").insert(lines))
    },

    async deleteRecipes(ids) {
      if (ids.length) check(await db.from("recipes").delete().in("id", ids))
    },

    async saveStores(stores, sort, categories) {
      if (!stores.length) return
      check(await db.from("stores").upsert(stores.map((x) => ({ id: x.id, name: x.name, kind: x.kind || null, place: x.place || null, sort: sort(x.id) })), { onConflict: "id" }))
      check(await db.from("store_aisles").delete().in("store_id", stores.map((x) => x.id)))
      const aisles = stores.flatMap((x) =>
        Object.entries(x.aisles)
          .filter(([id, n]) => n != null && categories.has(id))
          .map(([category_id, number]) => ({ store_id: x.id, category_id, number: number! })),
      )
      if (aisles.length) check(await db.from("store_aisles").insert(aisles))
    },

    async deleteStores(ids) {
      if (ids.length) check(await db.from("stores").delete().in("id", ids))
    },

    async addHistory(row) {
      check(await db.from("history").insert(row))
    },

    async history(limit) {
      return check(await db.from("history").select("*").order("at", { ascending: false }).limit(limit)) as HistoryRow[]
    },
  }
}

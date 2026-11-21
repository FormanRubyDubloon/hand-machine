// Reading and writing the pantry items in Supabase, shared by the pantry app and the phone app so
// both turn an item into a row (and back) the same way. Writing needs a Supabase Auth session and
// the item policies from supabase/migrations/20261114140000_auth_and_item_writes.sql.
import { supabase } from "@/lib/supabase"
import { ITEM_SELECT } from "./supabase-seed"
import { recipeRows, storeExtras, toEntryRow, toItem, toRecipe, toRow, type RecipeRow, type Row } from "./rows"
import type { Category, SharedItem, SharedRecipe, SharedStore } from "./pantry"
import { isCategoryColour, isCategoryIcon } from "./category-look"

type Items = Record<string, SharedItem>

/** Keys in order at every level, undefined dropped: Supabase hands JSON back with its keys sorted. */
export function sortKeys(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortKeys)
  if (v && typeof v === "object") {
    return Object.fromEntries(
      Object.entries(v)
        .filter(([, x]) => x !== undefined)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, x]) => [k, sortKeys(x)]),
    )
  }
  return v
}

/**
 * What counts as a change: everything that is saved, nothing derived (editedAt, store ids). Keys
 * are sorted all the way down, because jsonb (the History undo snapshots) comes back with its
 * keys sorted however the app wrote it.
 */
export function fingerprint(i: SharedItem | undefined): string {
  if (!i) return ""
  // The chosen store (where) syncs since 21 Nov 2026 (store_ids), so it counts as a change.
  const { editedAt: _e, addedAt: _a, ...rest } = i
  return JSON.stringify(sortKeys({ ...rest, where: [...(i.where ?? [])].sort() }))
}

export { toRow }

/** Every item and category id in Supabase. Throws with Supabase's message if the read fails. */
export async function fetchRemote(): Promise<{ items: Items; categories: Set<string> }> {
  const [itemsRes, catsRes] = await Promise.all([supabase.from("items").select(ITEM_SELECT), supabase.from("categories").select("id")])
  if (itemsRes.error) throw new Error(itemsRes.error.message)
  if (catsRes.error) throw new Error(catsRes.error.message)
  return {
    items: Object.fromEntries((itemsRes.data as Row[]).map((r) => [r.id, toItem(r)])),
    categories: new Set((catsRes.data as { id: string }[]).map((c) => c.id)),
  }
}

/**
 * Upserts the given items and deletes the given ids. Returns each pushed item as Supabase will
 * hand it back, so the next sync doesn't see a phantom change. Throws if Supabase refuses.
 *
 * Ids in `onlyStock` already exist in Supabase and are written as stock, New flag and list entries
 * only (what the phone edits), so a pantry-app edit made since they were fetched isn't overwritten.
 */
export async function writeRemote(push: SharedItem[], remove: string[], categories: Set<string>, onlyStock: Set<string> = new Set()): Promise<Items> {
  const back: Items = {}
  if (push.length) {
    const full = push.filter((i) => !onlyStock.has(i.id))
    const rows = full.map((i) => toRow(i, categories))
    if (rows.length) {
      const { error } = await supabase.from("items").upsert(rows, { onConflict: "owner_id,id" })
      if (error) throw new Error(error.message)
    }
    for (const i of push.filter((i) => onlyStock.has(i.id))) {
      const edited_at = new Date().toISOString()
      const { error } = await supabase.from("items").update({ in_stock: i.inStock, needs_review: !!i.review, edited_at }).eq("id", i.id)
      if (error) throw new Error(error.message)
      back[i.id] = { ...i, editedAt: edited_at }
    }
    // The shopping list's entries are their own table: replace each pushed item's.
    const ids = push.map((i) => i.id)
    const del = await supabase.from("list_entries").delete().in("item_id", ids)
    if (del.error) throw new Error(del.error.message)
    const entries = push.flatMap((i) => (i.entries ?? []).map((e, n) => ({ item_id: i.id, ...toEntryRow(e, n) })))
    if (entries.length) {
      const ins = await supabase.from("list_entries").insert(entries)
      if (ins.error) throw new Error(ins.error.message)
    }
    for (const [n, row] of rows.entries()) {
      back[row.id] = toItem({ ...row, list_entries: (full[n].entries ?? []).map(toEntryRow) } as Row)
    }
  }
  if (remove.length) {
    const { error } = await supabase.from("items").delete().in("id", remove)
    if (error) throw new Error(error.message)
  }
  return back
}

// ---------- categories ----------
// Writing needs the policies in supabase/migrations/20261114160000_category_writes.sql.

export type CategoryRow = { id: string; name: string; sort: number; colour: string | null; icon: string | null }

/** A category row as the apps hold it. A colour or icon the apps don't know is dropped. */
export function toCategory(r: Pick<CategoryRow, "id" | "name"> & Partial<CategoryRow>): Category {
  const c: Category = { id: r.id, name: r.name }
  if (isCategoryColour(r.colour)) c.colour = r.colour
  if (isCategoryIcon(r.icon)) c.icon = r.icon
  return c
}

/** Every category in Supabase, in its saved order. Needs 20261117120000_category_colour_and_icon. */
export async function fetchCategories(): Promise<CategoryRow[]> {
  const { data, error } = await supabase.from("categories").select("id, name, sort, colour, icon").order("sort")
  if (error) throw new Error(error.message)
  return data as CategoryRow[]
}

/** Adds, renames or recolours categories. Throws if Supabase refuses (for example, two categories with one name). */
export async function upsertCategories(rows: CategoryRow[]) {
  if (!rows.length) return
  const { error } = await supabase.from("categories").upsert(rows, { onConflict: "owner_id,id" })
  if (error) throw new Error(error.message)
}

/**
 * Deletes categories. One that items in Supabase still use can't go (the foreign key says no):
 * it's left there and returned, so the next sync tries again.
 */
export async function deleteCategories(ids: string[]): Promise<Category[]> {
  const kept: Category[] = []
  for (const id of ids) {
    const { error } = await supabase.from("categories").delete().eq("id", id)
    if (error?.code === "23503") {
      const { data } = await supabase.from("categories").select("id, name").eq("id", id).maybeSingle()
      if (data) kept.push(data as Category)
    } else if (error) throw new Error(error.message)
  }
  return kept
}

// ---------- stores and aisle numbers ----------
// Tables and policies in supabase/migrations/20261114170000_stores.sql.

type StoreRow = { id: string; name: string; kind: string | null; place: string | null; no_aisle_numbers?: boolean; sells?: string[] }

/** Every store in Supabase, in its saved order, with its aisle numbers. Categories it doesn't number are left out. */
export async function fetchStores(): Promise<SharedStore[]> {
  const [storesRes, aislesRes] = await Promise.all([
    supabase.from("stores").select("id, name, kind, place, sort, no_aisle_numbers, sells").order("sort"),
    supabase.from("store_aisles").select("store_id, category_id, number"),
  ])
  if (storesRes.error) throw new Error(storesRes.error.message)
  if (aislesRes.error) throw new Error(aislesRes.error.message)
  const aisles = aislesRes.data as { store_id: string; category_id: string; number: number }[]
  return (storesRes.data as StoreRow[]).map((r) => ({
    id: r.id,
    name: r.name,
    kind: r.kind ?? "",
    place: r.place ?? "",
    aisles: Object.fromEntries(aisles.filter((a) => a.store_id === r.id).map((a) => [a.category_id, a.number])),
    ...storeExtras(r),
  }))
}

/**
 * Adds or changes stores and replaces their aisle numbers. `sort` gives each store's place in the
 * list; `categories` are the ids Supabase has, so a number for any other category is left out.
 */
export async function writeStores(stores: SharedStore[], sort: (id: string) => number, categories: Set<string>) {
  if (!stores.length) return
  const rows = stores.map((x) => ({ id: x.id, name: x.name, kind: x.kind || null, place: x.place || null, sort: sort(x.id), no_aisle_numbers: !!x.noAisleNumbers, sells: x.sells ?? [] }))
  const up = await supabase.from("stores").upsert(rows, { onConflict: "owner_id,id" })
  if (up.error) throw new Error(up.error.message)
  const ids = stores.map((x) => x.id)
  const del = await supabase.from("store_aisles").delete().in("store_id", ids)
  if (del.error) throw new Error(del.error.message)
  const aisles = stores.flatMap((x) =>
    Object.entries(x.aisles)
      .filter(([id, n]) => n != null && categories.has(id))
      .map(([category_id, number]) => ({ store_id: x.id, category_id, number: number! })),
  )
  if (!aisles.length) return
  const ins = await supabase.from("store_aisles").insert(aisles)
  if (ins.error) throw new Error(ins.error.message)
}

/** Deletes stores; their aisle numbers go with them. */
export async function deleteStores(ids: string[]) {
  if (!ids.length) return
  const { error } = await supabase.from("stores").delete().in("id", ids)
  if (error) throw new Error(error.message)
}

// ---------- recipes ----------
// Writing needs the policies in supabase/migrations/20261114180000_recipe_writes.sql.

const RECIPE_SELECT = "*, recipe_ingredients(position, text, group_name, item_id, need, buy, partial, optional, uses)"

/** Recipe rows as Supabase has them, by id; `ids` limits it to those recipes. */
export async function fetchRecipeRows(ids?: string[]): Promise<Record<string, RecipeRow>> {
  let query = supabase.from("recipes").select(RECIPE_SELECT).order("name")
  if (ids) query = query.in("id", ids)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return Object.fromEntries((data as RecipeRow[]).map((r) => [r.id, r]))
}

export { toRecipe }

/**
 * Adds or changes recipes and replaces their ingredients. Columns the app doesn't have (emoji,
 * source link, Notion id) are left as they are. A link to an item Supabase doesn't have is dropped.
 */
export async function writeRecipes(recipes: SharedRecipe[], before: Record<string, RecipeRow>, items: Set<string>) {
  if (!recipes.length) return
  const { rows, lines } = recipeRows(recipes, before, items)
  const up = await supabase.from("recipes").upsert(rows, { onConflict: "owner_id,id" })
  if (up.error) throw new Error(up.error.message)
  const ids = recipes.map((r) => r.id)
  const del = await supabase.from("recipe_ingredients").delete().in("recipe_id", ids)
  if (del.error) throw new Error(del.error.message)
  if (!lines.length) return
  const ins = await supabase.from("recipe_ingredients").insert(lines)
  if (ins.error) throw new Error(ins.error.message)
}

/** Deletes recipes; their ingredients go with them. */
export async function deleteRecipes(ids: string[]) {
  if (!ids.length) return
  const { error } = await supabase.from("recipes").delete().in("id", ids)
  if (error) throw new Error(error.message)
}

/** True for a failure to reach Supabase at all, as opposed to Supabase saying no. */
export const isNetworkError = (e: unknown) => !navigator.onLine || (e instanceof Error && /failed to fetch|network|load failed/i.test(e.message))

// ---------- history ----------
// Table and policies in supabase/migrations/20261115100000_list_entries_and_history.sql. Signed-in users only.

export type HistoryRow = {
  id: string
  at: string
  who: "you" | "claude" | "phone"
  title: string
  detail: string | null
  item_ids: string[]
  recipe_id: string | null
  undo: unknown
  undone: boolean
  /** What an undo overwrote, so the app can revert it (20261120200000_history_redo). */
  redo?: unknown
  key: string | null
}

/** The newest history rows, newest first. */
export async function fetchHistory(limit = 500): Promise<HistoryRow[]> {
  const { data, error } = await supabase.from("history").select("*").order("at", { ascending: false }).limit(limit)
  if (error) throw new Error(error.message)
  return data as HistoryRow[]
}

export async function writeHistory(rows: HistoryRow[]) {
  if (!rows.length) return
  const { error } = await supabase.from("history").upsert(rows, { onConflict: "owner_id,id" })
  if (error) throw new Error(error.message)
}

/** Whether the signed-in account has anything in its pantry yet: any category or item. Used to skip Setup. */
export async function hasRemotePantry(): Promise<boolean> {
  const [items, categories] = await Promise.all([
    supabase.from("items").select("id", { count: "exact", head: true }),
    supabase.from("categories").select("id", { count: "exact", head: true }),
  ])
  // Can't tell (offline, an error): don't put an existing account through Setup.
  if (items.error || categories.error) return true
  return (items.count ?? 0) + (categories.count ?? 0) > 0
}

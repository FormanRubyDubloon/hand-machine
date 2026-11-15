// Reading and writing the pantry items in Supabase, shared by the pantry app and the phone app so
// both turn an item into a row (and back) the same way. Writing needs a Supabase Auth session and
// the item policies from supabase/migrations/20261114140000_auth_and_item_writes.sql.
import { supabase } from "@/lib/supabase"
import { ITEM_SELECT, toEntryRow, toItem, toRecipe, type RecipeRow, type Row } from "./supabase-seed"
import type { Category, SharedItem, SharedRecipe, SharedStore } from "./pantry"

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
  const { editedAt: _e, where: _w, ...rest } = i
  return JSON.stringify(sortKeys(rest))
}

/** The database keeps one free-text unit ("bag"); the app guesses the plural back (see unitPair). */
const unitText = (u: SharedItem["unit"]) => u?.[0] ?? null

export function toRow(i: SharedItem, knownCategories: Set<string>) {
  return {
    id: i.id,
    name: i.name,
    category_id: i.categoryId && knownCategories.has(i.categoryId) ? i.categoryId : null,
    type: i.type,
    target: i.target,
    in_stock: i.inStock,
    unit: unitText(i.unit),
    notes: i.notes ?? null,
    location: i.location ?? null,
    other_names: i.otherNames ?? [],
    open: i.open ?? null,
    pack_size_amount: i.packSize?.amount ?? null,
    pack_size_measure: i.packSize?.measure ?? null,
    price: i.price ?? null,
    brand: i.brand ?? null,
    use_by: (i.useBy ?? []).filter((d): d is string => !!d),
    opened_at: (i.openedAt ?? []).filter((d): d is string => !!d),
    one_off: !!i.oneOff,
    uses: i.uses ?? 0,
    edited_at: i.editedAt ?? new Date().toISOString(),
  }
}

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
 */
export async function writeRemote(push: SharedItem[], remove: string[], categories: Set<string>): Promise<Items> {
  const back: Items = {}
  if (push.length) {
    const rows = push.map((i) => toRow(i, categories))
    const { error } = await supabase.from("items").upsert(rows, { onConflict: "id" })
    if (error) throw new Error(error.message)
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
      back[row.id] = toItem({ ...row, list_entries: (push[n].entries ?? []).map(toEntryRow) } as Row)
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

export type CategoryRow = { id: string; name: string; sort: number }

/** Every category in Supabase, in its saved order. */
export async function fetchCategories(): Promise<CategoryRow[]> {
  const { data, error } = await supabase.from("categories").select("id, name, sort").order("sort")
  if (error) throw new Error(error.message)
  return data as CategoryRow[]
}

/** Adds or renames categories. Throws if Supabase refuses (for example, two categories with one name). */
export async function upsertCategories(rows: CategoryRow[]) {
  if (!rows.length) return
  const { error } = await supabase.from("categories").upsert(rows, { onConflict: "id" })
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

/** Every store in Supabase, in its saved order, with its aisle numbers. Categories it doesn't number are left out. */
export async function fetchStores(): Promise<SharedStore[]> {
  const [storesRes, aislesRes] = await Promise.all([
    supabase.from("stores").select("id, name, kind, place, sort").order("sort"),
    supabase.from("store_aisles").select("store_id, category_id, number"),
  ])
  if (storesRes.error) throw new Error(storesRes.error.message)
  if (aislesRes.error) throw new Error(aislesRes.error.message)
  const aisles = aislesRes.data as { store_id: string; category_id: string; number: number }[]
  return (storesRes.data as { id: string; name: string; kind: string | null; place: string | null }[]).map((r) => ({
    id: r.id,
    name: r.name,
    kind: r.kind ?? "",
    place: r.place ?? "",
    aisles: Object.fromEntries(aisles.filter((a) => a.store_id === r.id).map((a) => [a.category_id, a.number])),
  }))
}

/**
 * Adds or changes stores and replaces their aisle numbers. `sort` gives each store's place in the
 * list; `categories` are the ids Supabase has, so a number for any other category is left out.
 */
export async function writeStores(stores: SharedStore[], sort: (id: string) => number, categories: Set<string>) {
  if (!stores.length) return
  const rows = stores.map((x) => ({ id: x.id, name: x.name, kind: x.kind || null, place: x.place || null, sort: sort(x.id) }))
  const up = await supabase.from("stores").upsert(rows, { onConflict: "id" })
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

const RECIPE_SELECT = "*, recipe_ingredients(position, text, group_name, item_id, need, buy, partial, uses)"

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
 * The app keeps one Notes field; Supabase keeps Notion's opening paragraph (intro) apart. If the
 * notes still start with the intro, it stays the intro; otherwise it's all notes.
 */
function splitNotes(notes: string | undefined, before: RecipeRow | undefined) {
  const intro = before?.intro
  if (!notes) return { intro: null, notes: null }
  if (intro && notes.startsWith(intro)) return { intro, notes: notes.slice(intro.length).replace(/^\s+/, "") || null }
  return { intro: null, notes }
}

/**
 * Each line keeps the group it had ("For the pasta"), found by its wording. A new line takes the
 * group of the line above it.
 */
function groupsFor(r: SharedRecipe, before: RecipeRow | undefined): (string | null)[] {
  const old = [...(before?.recipe_ingredients ?? [])].sort((a, b) => a.position - b.position)
  const used = new Set<number>()
  let last: string | null = null
  return r.ingredients.map((g) => {
    const k = old.findIndex((o, n) => !used.has(n) && o.text === g.text)
    if (k >= 0) {
      used.add(k)
      last = old[k].group_name ?? null
    }
    return last
  })
}

/**
 * Adds or changes recipes and replaces their ingredients. Columns the app doesn't have (emoji,
 * source link, Notion id) are left as they are. A link to an item Supabase doesn't have is dropped.
 */
export async function writeRecipes(recipes: SharedRecipe[], before: Record<string, RecipeRow>, items: Set<string>) {
  if (!recipes.length) return
  const rows = recipes.map((r) => ({
    id: r.id,
    name: r.name,
    ...splitNotes(r.notes, before[r.id]),
    serves: r.serves,
    minutes: r.minutes || null,
    prep: r.prep ?? null,
    cook: r.cook ?? null,
    source: r.source ?? null,
    method: r.method,
    tags: r.tags ?? [],
    meal: r.meal ?? null,
    want_to_cook: r.wantToCook,
    soon: r.soon ?? null,
    last_cooked: r.lastCooked ?? null,
    added_by: r.addedBy ?? "you",
    added_at: r.addedAt ?? new Date().toISOString(),
  }))
  const up = await supabase.from("recipes").upsert(rows, { onConflict: "id" })
  if (up.error) throw new Error(up.error.message)
  const ids = recipes.map((r) => r.id)
  const del = await supabase.from("recipe_ingredients").delete().in("recipe_id", ids)
  if (del.error) throw new Error(del.error.message)
  const lines = recipes.flatMap((r) => {
    const groups = groupsFor(r, before[r.id])
    return r.ingredients.map((g, position) => ({
      recipe_id: r.id,
      position,
      text: g.text,
      group_name: groups[position],
      item_id: g.itemId && items.has(g.itemId) ? g.itemId : null,
      need: g.need,
      buy: g.buy,
      partial: !!g.partial,
      uses: g.uses ?? null,
    }))
  })
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
  const { error } = await supabase.from("history").upsert(rows, { onConflict: "id" })
  if (error) throw new Error(error.message)
}

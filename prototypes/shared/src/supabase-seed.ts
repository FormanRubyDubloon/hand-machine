// Fills the shared seed with the pantry items in Supabase (the Notion pantry, loaded there). Both
// prototypes await this before they render, so the rest of the code can keep treating the seed
// as plain data. This file only reads. The pantry app writes changes back at Sync (pantry-app/src/sync.ts).
import { supabase } from "@/lib/supabase"
import { seedItems, seedRecipes, type ListEntry, type ListSource, type SharedItem, type SharedRecipe } from "./pantry"

/** One row of `list_entries`: an entry on the shopping list for an item. */
export type ListEntryRow = { position: number; kind: ListSource["kind"]; recipe: string | null; qty: number; at: string | null }

/** The columns to select from `items`, with each item's list entries. */
export const ITEM_SELECT = "*, list_entries(position, kind, recipe, qty, at)"

export const toEntry = (r: ListEntryRow): ListEntry => ({
  source: r.kind === "recipe" ? { kind: "recipe", recipe: r.recipe ?? "" } : { kind: r.kind },
  qty: Number(r.qty),
  // Supabase hands a time back in its own format; keep one format so a round trip isn't a change.
  ...(r.at ? { at: new Date(r.at).toISOString() } : {}),
})

export const toEntryRow = (e: ListEntry, position: number): ListEntryRow => ({
  position,
  kind: e.source.kind,
  recipe: e.source.kind === "recipe" ? e.source.recipe : null,
  qty: e.qty,
  at: e.at ? new Date(e.at).toISOString() : null,
})

export type Row = {
  id: string
  name: string
  category_id: string | null
  type: "counted" | "bulk"
  target: number | null
  in_stock: number | null
  unit: string | null
  notes: string | null
  location: SharedItem["location"] | null
  other_names: string[]
  open: number | null
  pack_size_amount: number | null
  pack_size_measure: "g" | "ml" | null
  price: number | null
  brand: string | null
  use_by: string[]
  one_off: boolean
  uses: number
  list_entries: ListEntryRow[] | null
  opened_at: string[]
  edited_at: string
}

/** Notion's unit is free text ("bag", "350 g", "kg"); the app wants [one, many]. A guess, for display. */
export function unitPair(u: string | null): [string, string] | undefined {
  if (!u) return undefined
  if (/\d|^(kg|g|ml|litres?|pound)$/i.test(u) || u.includes(" ")) return [u, u]
  const one = /[^s]s$/i.test(u) ? u.slice(0, -1) : u
  return [one, /(ch|sh|x)$/i.test(one) ? `${one}es` : `${one}s`]
}

export function toItem(r: Row): SharedItem {
  return {
    id: r.id,
    name: r.name,
    type: r.type,
    target: r.target ?? 0,
    inStock: r.in_stock ?? 0,
    unit: unitPair(r.unit),
    notes: r.notes ?? undefined,
    categoryId: r.category_id ?? "",
    where: [],
    location: r.location ?? undefined,
    otherNames: r.other_names.length ? r.other_names : undefined,
    open: r.open ?? undefined,
    packSize: r.pack_size_amount && r.pack_size_measure ? { amount: r.pack_size_amount, measure: r.pack_size_measure } : undefined,
    price: r.price ?? undefined,
    brand: r.brand ?? undefined,
    useBy: r.use_by.length ? r.use_by : undefined,
    oneOff: r.one_off || undefined,
    uses: r.uses || undefined,
    entries: r.list_entries?.length ? [...r.list_entries].sort((a, b) => a.position - b.position).map(toEntry) : undefined,
    openedAt: r.opened_at?.length ? r.opened_at : undefined,
    editedAt: r.edited_at,
  }
}

export type RecipeRow = {
  id: string
  name: string
  intro: string | null
  serves: number | null
  minutes: number | null
  prep: number | null
  cook: number | null
  source: string | null
  notes: string | null
  method: string[]
  tags: string[]
  meal: SharedRecipe["meal"] | null
  want_to_cook: boolean
  soon: string | null
  last_cooked: string | null
  added_by: "claude" | "you"
  added_at: string
  recipe_ingredients: { position: number; text: string; group_name?: string | null; item_id: string | null; need: number; buy: number; partial: boolean; uses: number | null }[]
}

/**
 * Unknown serves falls back to 2 (the app's default), unknown time to 0 ("No time"). Linked
 * ingredients from Notion are stored as partial (any stock will do; migration
 * 20261114180000_recipe_writes), so `partial` is read as it is.
 */
export function toRecipe(r: RecipeRow): SharedRecipe {
  return {
    id: r.id,
    name: r.name,
    minutes: r.minutes ?? 0,
    serves: r.serves ?? 2,
    wantToCook: r.want_to_cook,
    soon: r.soon ?? undefined,
    ingredients: [...r.recipe_ingredients]
      .sort((a, b) => a.position - b.position)
      .map((i) => ({ text: i.text, itemId: i.item_id ?? "", need: i.need, buy: i.buy, partial: i.partial || undefined, uses: i.uses ?? undefined })),
    method: r.method,
    prep: r.prep ?? undefined,
    cook: r.cook ?? undefined,
    tags: r.tags,
    meal: r.meal ?? undefined,
    source: r.source ?? undefined,
    notes: [r.intro, r.notes].filter(Boolean).join("\n\n") || undefined,
    lastCooked: r.last_cooked,
    addedBy: r.added_by,
    addedAt: r.added_at,
  }
}

let loaded: Promise<void> | null = null

/** Fetches the items and recipes once and fills the seed. Failing leaves the pantry empty rather than blocking the app. */
export function loadSeedFromSupabase(): Promise<void> {
  loaded ??= (async () => {
    const [items, recipes] = await Promise.all([
      supabase.from("items").select(ITEM_SELECT).order("name"),
      supabase.from("recipes").select("*, recipe_ingredients(position, text, item_id, need, buy, partial, uses)").order("name"),
    ])
    if (items.error || !items.data) console.error("Couldn't load the pantry from Supabase:", items.error?.message)
    else seedItems.splice(0, seedItems.length, ...(items.data as Row[]).map(toItem))
    if (recipes.error || !recipes.data) console.error("Couldn't load the recipes from Supabase:", recipes.error?.message)
    else seedRecipes.splice(0, seedRecipes.length, ...(recipes.data as RecipeRow[]).map(toRecipe))
  })()
  return loaded
}

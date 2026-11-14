// Fills the shared seed with the pantry items in Supabase (the Notion pantry, loaded there). Both
// prototypes await this before they render, so the rest of the code can keep treating the seed
// as plain data. This file only reads. The pantry app writes changes back at Sync (pantry-app/src/sync.ts).
import { supabase } from "@/lib/supabase"
import { seedItems, seedRecipes, type ListEntry, type SharedItem, type SharedRecipe } from "./pantry"

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
  entries: ListEntry[]
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
    entries: r.entries?.length ? r.entries : undefined,
    openedAt: r.opened_at?.length ? r.opened_at : undefined,
    editedAt: r.edited_at,
  }
}

type RecipeRow = {
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
  recipe_ingredients: { position: number; text: string; item_id: string | null; need: number; buy: number; partial: boolean; uses: number | null }[]
}

/**
 * Notion's recipes don't say how much of an item each line uses, so a linked ingredient counts as
 * "partial": having any of the item is enough. Unknown serves falls back to 2 (the app's default).
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
      .map((i) => ({ text: i.text, itemId: i.item_id ?? "", need: i.need, buy: i.buy, partial: i.partial || !!i.item_id, uses: i.uses ?? undefined })),
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
      supabase.from("items").select("*").order("name"),
      supabase.from("recipes").select("*, recipe_ingredients(position, text, item_id, need, buy, partial, uses)").order("name"),
    ])
    if (items.error || !items.data) console.error("Couldn't load the pantry from Supabase:", items.error?.message)
    else seedItems.splice(0, seedItems.length, ...(items.data as Row[]).map(toItem))
    if (recipes.error || !recipes.data) console.error("Couldn't load the recipes from Supabase:", recipes.error?.message)
    else seedRecipes.splice(0, seedRecipes.length, ...(recipes.data as RecipeRow[]).map(toRecipe))
  })()
  return loaded
}

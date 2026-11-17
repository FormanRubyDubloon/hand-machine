// Fills the shared seed with the pantry items in Supabase (the Notion pantry, loaded there). Both
// prototypes await this before they render, so the rest of the code can keep treating the seed
// as plain data. This file only reads. The pantry app writes changes back at Sync (pantry-app/src/sync.ts).
import { supabase } from "@/lib/supabase"
import { seedItems, seedRecipes } from "./pantry"
import { ITEM_SELECT, toItem, toRecipe, type RecipeRow, type Row } from "./rows"

export * from "./rows"

let loaded: Promise<void> | null = null

/** Fetches the items and recipes once and fills the seed. Failing leaves the pantry empty rather than blocking the app. */
export function loadSeedFromSupabase(): Promise<void> {
  loaded ??= (async () => {
    const [items, recipes] = await Promise.all([
      supabase.from("items").select(ITEM_SELECT).order("name"),
      supabase.from("recipes").select("*, recipe_ingredients(position, text, item_id, need, buy, partial, optional, uses)").order("name"),
    ])
    if (items.error || !items.data) console.error("Couldn't load the pantry from Supabase:", items.error?.message)
    else seedItems.splice(0, seedItems.length, ...(items.data as Row[]).map(toItem))
    if (recipes.error || !recipes.data) console.error("Couldn't load the recipes from Supabase:", recipes.error?.message)
    else seedRecipes.splice(0, seedRecipes.length, ...(recipes.data as RecipeRow[]).map(toRecipe))
  })()
  return loaded
}

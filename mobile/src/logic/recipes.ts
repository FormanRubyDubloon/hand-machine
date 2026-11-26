// The Recipes tab's groups (26 Nov 2026): the landing page's cards and the list each one opens. Pure, so it's
// tested (test/recipes-landing.test.ts).
import { needOf, recipeInfo, soonest, type Items, type Recipe } from "../../../prototypes/pantry-app/src/model"
import { goingOffSoon } from "./phrases"

export type RecipeGroup = "all" | "cook" | "want" | "new" | "recommended" | "shop"

/** A recipe added this many days ago or less is newly added. */
export const NEW_DAYS = 14

export type RecipeRow = {
  recipe: Recipe
  /** Ingredients you're short of. */
  short: number
  /** Distinct ingredients on the shopping list. */
  onList: number
  /** The in-stock ingredient that's past its use-by or within two days of it, soonest first (as Home's Use soon). */
  usesUp: { name: string; date: string } | null
}

export function recipeRows(recipes: Recipe[], items: Items): RecipeRow[] {
  return recipes.map((recipe) => {
    const info = recipeInfo(recipe, items)
    const onList = new Set(recipe.ingredients.map((g) => g.itemId).filter((id) => id && items[id] && needOf(items[id]) > 0)).size
    let usesUp: RecipeRow["usesUp"] = null
    for (const r of info.rows) {
      if (!r.item || r.status === "short" || r.status === "listed" || !goingOffSoon(r.item)) continue
      const d = soonest(r.item)!
      if (!usesUp || d < usesUp.date) usesUp = { name: r.item.name, date: d }
    }
    return { recipe, short: info.short.length, onList, usesUp }
  })
}

/** The lists whose order you choose; the others keep their own (newest, soonest use-by, most on the list). */
export const sortableGroup = (g: RecipeGroup) => g === "all" || g === "cook" || g === "want"

const isNew = (r: Recipe, now: Date) => !!r.addedAt && now.getTime() - Date.parse(r.addedAt) <= NEW_DAYS * 86_400_000

/**
 * The recipes in a group, in that group's own order. All, Can cook now and Want to cook follow the chosen sort (`compare`);
 * Newly added is newest first; Recommended uses what goes off soonest first; This shop has most on the list first.
 */
export function inGroup(rows: RecipeRow[], group: RecipeGroup, compare: (a: Recipe, b: Recipe) => number, now = new Date()): RecipeRow[] {
  const by = (f: (a: RecipeRow, b: RecipeRow) => number) => (a: RecipeRow, b: RecipeRow) => f(a, b) || a.recipe.name.localeCompare(b.recipe.name)
  switch (group) {
    case "all": return [...rows].sort((a, b) => compare(a.recipe, b.recipe))
    case "cook": return rows.filter((r) => r.short === 0).sort((a, b) => compare(a.recipe, b.recipe))
    case "want": return rows.filter((r) => r.recipe.wantToCook).sort((a, b) => compare(a.recipe, b.recipe))
    case "new": return rows.filter((r) => isNew(r.recipe, now)).sort(by((a, b) => (b.recipe.addedAt ?? "").localeCompare(a.recipe.addedAt ?? "")))
    case "recommended": return rows.filter((r) => r.usesUp).sort(by((a, b) => a.usesUp!.date.localeCompare(b.usesUp!.date)))
    case "shop": return rows.filter((r) => r.onList > 0).sort(by((a, b) => b.onList - a.onList))
  }
}

// ---------- filters (26 Nov 2026) ----------

export type Meal = NonNullable<Recipe["meal"]>
export const MEALS: Meal[] = ["Breakfast", "Lunch", "Dinner", "Baking"]
export type TimeBand = "under20" | "20to40" | "over40"
export const TIMES: { value: TimeBand; label: string }[] = [
  { value: "under20", label: "Under 20 min" },
  { value: "20to40", label: "20 to 40 min" },
  { value: "over40", label: "Over 40 min" },
]

/**
 * The recipe lists' filters, as on the web's recipe list: one meal, one time band, and tags (any of them).
 * Kept on this phone and shared by every list, with the sort.
 */
export type RecipeFilter = { meal?: Meal; time?: TimeBand; tags?: string[] }

/** Matches the web's minutesBand: under 20, 20 to 40, over 40 (no time is in none of them). */
const band = (m: number): TimeBand | null => (m <= 0 ? null : m < 20 ? "under20" : m <= 40 ? "20to40" : "over40")

export const recipeFiltersOn = (f: RecipeFilter | undefined) => (f ? Number(!!f.meal) + Number(!!f.time) + Number(!!f.tags?.length) : 0)

/** A recipe's meal: its meal, or a tag with a meal's name (many recipes carry the meal as a tag). */
const isMeal = (r: Recipe, m: Meal) => r.meal === m || (r.tags ?? []).some((t) => t.toLowerCase() === m.toLowerCase())

export const matchesRecipe = (r: Recipe, f: RecipeFilter | undefined) =>
  !f ||
  ((!f.meal || isMeal(r, f.meal)) &&
    (!f.time || band(r.minutes) === f.time) &&
    (!f.tags?.length || (r.tags ?? []).some((t) => f.tags!.includes(t.toLowerCase()))))

/** The recipes' tags, most used first (ties A to Z), lower case. Meal names are left out: Meal has its own filter. */
export function commonTags(recipes: Recipe[], n = 12) {
  const meals = new Set(MEALS.map((m) => m.toLowerCase()))
  const counts = new Map<string, number>()
  for (const r of recipes) for (const t of new Set((r.tags ?? []).map((t) => t.toLowerCase()))) if (!meals.has(t)) counts.set(t, (counts.get(t) ?? 0) + 1)
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, n).map(([t]) => t)
}

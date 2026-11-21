// Recipe sorts: the same three as the pantry app's recipe list. Dates sort newest first; a recipe with no date goes last.
import type { Recipe } from "../../../prototypes/pantry-app/src/model"

export type RecipeSort = "name" | "added" | "edited"

const byName = (a: Recipe, b: Recipe) => a.name.localeCompare(b.name)
const newest = (get: (r: Recipe) => string | undefined) => (a: Recipe, b: Recipe) => (get(b) ?? "").localeCompare(get(a) ?? "") || byName(a, b)

export const RECIPE_SORTS: { value: RecipeSort; label: string; compare: (a: Recipe, b: Recipe) => number }[] = [
  { value: "name", label: "A–Z", compare: byName },
  { value: "added", label: "Date added", compare: newest((r) => r.addedAt) },
  { value: "edited", label: "Date edited", compare: newest((r) => r.editedAt) },
]

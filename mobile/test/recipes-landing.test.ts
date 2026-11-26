import { describe, expect, it } from "vitest"
import { demoState } from "../src/data/demo"
import { inGroup, NEW_DAYS, recipeRows } from "../src/logic/recipes"
import { RECIPE_SORTS } from "../src/logic/sort"

const byName = RECIPE_SORTS[0].compare
const today = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10)

describe("the Recipes landing page's groups", () => {
  it("All has every recipe; Want to cook only those marked", () => {
    const s = demoState()
    const rows = recipeRows(s.recipes, s.items)
    expect(inGroup(rows, "all", byName)).toHaveLength(s.recipes.length)
    expect(inGroup(rows, "want", byName).every((r) => r.recipe.wantToCook)).toBe(true)
  })

  it("Can cook now has only recipes you're short of nothing for", () => {
    const s = demoState()
    const rows = recipeRows(s.recipes, s.items)
    const got = inGroup(rows, "cook", byName)
    expect(got.every((r) => r.short === 0)).toBe(true)
    expect(got.length).toBe(rows.filter((r) => r.short === 0).length)
  })

  it("Newly added is the last two weeks, newest first", () => {
    const s = demoState()
    const now = new Date()
    const recipes = s.recipes.map((r, k) => ({ ...r, addedAt: new Date(now.getTime() - [1, NEW_DAYS + 3, 5][k % 3] * 86_400_000).toISOString() }))
    const got = inGroup(recipeRows(recipes, s.items), "new", byName, now)
    expect(got.length).toBeGreaterThan(0)
    for (const r of got) expect(now.getTime() - Date.parse(r.recipe.addedAt!)).toBeLessThanOrEqual(NEW_DAYS * 86_400_000)
    const dates = got.map((r) => r.recipe.addedAt!)
    expect(dates).toEqual([...dates].sort().reverse())
  })

  it("Recommended uses something in stock that's past or near its use-by, soonest first", () => {
    const s = demoState()
    const recipe = s.recipes.find((r) => r.ingredients.some((g) => g.itemId && s.items[g.itemId]))!
    const id = recipe.ingredients.find((g) => g.itemId && s.items[g.itemId])!.itemId!
    // Nothing in it goes off soon: not recommended.
    const fresh = { ...s.items }
    for (const g of recipe.ingredients) if (g.itemId && fresh[g.itemId]) fresh[g.itemId] = { ...fresh[g.itemId], inStock: 2, useBy: [today(30), today(30)], noExpiry: undefined }
    expect(inGroup(recipeRows([recipe], fresh), "recommended", byName)).toHaveLength(0)
    // One goes off tomorrow: recommended, naming it.
    const soon = { ...fresh, [id]: { ...fresh[id], useBy: [today(1), today(30)] } }
    const got = inGroup(recipeRows([recipe], soon), "recommended", byName)
    expect(got.map((r) => r.recipe.id)).toEqual([recipe.id])
    expect(got[0].usesUp?.name).toBe(s.items[id].name)
  })

  it("This shop has recipes with something on the list, most first", () => {
    const s = demoState()
    const got = inGroup(recipeRows(s.recipes, s.items), "shop", byName)
    expect(got.every((r) => r.onList > 0)).toBe(true)
    expect(got.map((r) => r.onList)).toEqual([...got.map((r) => r.onList)].sort((a, b) => b - a))
  })
})

describe("recipe filters", () => {
  it("filter by meal, time and any of the tags; counts how many are on", async () => {
    const { matchesRecipe, recipeFiltersOn, commonTags } = await import("../src/logic/recipes")
    const base = demoState().recipes[0]
    const r = { ...base, meal: "Dinner" as const, minutes: 25, tags: ["Quick", "Fish"] }
    expect(matchesRecipe(r, undefined)).toBe(true)
    expect(matchesRecipe(r, { meal: "Dinner", time: "20to40" })).toBe(true)
    expect(matchesRecipe(r, { meal: "Lunch" })).toBe(false)
    expect(matchesRecipe(r, { time: "under20" })).toBe(false)
    expect(matchesRecipe(r, { tags: ["fish", "vegan"] })).toBe(true)
    expect(matchesRecipe(r, { tags: ["vegan"] })).toBe(false)
    expect(recipeFiltersOn({ meal: "Dinner", tags: [] })).toBe(1)
    expect(commonTags([r, { ...r, tags: ["fish"] }])).toEqual(["fish", "quick"])
    // A meal carried as a tag counts as that meal, and isn't offered again as a tag.
    const tagged = { ...r, meal: undefined, tags: ["Breakfast", "Quick"] }
    expect(matchesRecipe(tagged, { meal: "Breakfast" })).toBe(true)
    expect(commonTags([tagged])).toEqual(["quick"])
  })
})

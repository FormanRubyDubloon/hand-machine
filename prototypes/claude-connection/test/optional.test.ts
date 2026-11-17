import { test, expect } from "vitest"
import { recipeInfo, type Recipe } from "../../pantry-app/src/model"
import { ingredientLine } from "../src/text"

const recipe = {
  id: "r", name: "Salad", minutes: 0, serves: 2, wantToCook: false, method: [], lastCooked: null,
  ingredients: [
    { text: "1 lettuce", itemId: "", need: 1, buy: 1 },
    { text: "Small bunch parsley", itemId: "", need: 1, buy: 1, optional: true },
  ],
} as unknown as Recipe

test("an optional ingredient says so in Claude's text and isn't counted as missing", () => {
  const info = recipeInfo(recipe, {})
  expect(info.short.map((r) => r.text)).toEqual(["1 lettuce"])
  expect(info.needed).toBe(1)
  expect(ingredientLine(info.rows[1])).toContain("optional")
  expect(ingredientLine(info.rows[0])).not.toContain("optional")
})

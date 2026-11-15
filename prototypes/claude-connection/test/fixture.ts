import type { PantryData } from "../src/backend"
import type { SharedItem } from "../../shared/src/pantry"

const item = (i: Partial<SharedItem> & Pick<SharedItem, "id" | "name">): SharedItem => ({
  type: "counted", target: 0, inStock: 0, categoryId: "fruit-and-veg", where: [], ...i,
})

export const fixture = (): PantryData => ({
  categories: [
    { id: "fruit-and-veg", name: "Fruit & veg" },
    { id: "tins-and-jars", name: "Tins & jars" },
    { id: "grains-and-pulses", name: "Grains & pulses" },
    { id: "baking", name: "Baking" },
  ],
  stores: [{ id: "tesco", name: "Tesco Express", kind: "Supermarket", place: "", aisles: { "fruit-and-veg": 1, "tins-and-jars": 6, "grains-and-pulses": 5 } }],
  items: Object.fromEntries([
    item({ id: "eggs", name: "Eggs", target: 6, inStock: 4, categoryId: "fruit-and-veg" }),
    item({ id: "red-onions", name: "Red onions", inStock: 2 }),
    item({ id: "brown-onions", name: "Brown onions", inStock: 3 }),
    item({ id: "chopped-tomatoes", name: "Chopped tomatoes", unit: ["tin", "tins"], target: 2, inStock: 2, categoryId: "tins-and-jars" }),
    item({ id: "rice", name: "Rice", type: "bulk", unit: ["bag", "bags"], target: 1, inStock: 2, open: 1, categoryId: "grains-and-pulses", useBy: [null, null], openedAt: ["2026-11-01"] }),
    item({ id: "plain-flour", name: "Plain flour", type: "bulk", unit: ["bag", "bags"], inStock: 1, open: 1, categoryId: "baking", useBy: [null], openedAt: [null] }),
  ].map((i) => [i.id, i])),
  recipes: [
    {
      id: "shakshuka", name: "Shakshuka", minutes: 30, serves: 2, wantToCook: false, method: ["Fry", "Simmer", "Crack the eggs in"],
      ingredients: [
        { text: "4 eggs", itemId: "eggs", need: 4, buy: 6 },
        { text: "1 red onion", itemId: "red-onions", need: 1, buy: 1 },
        { text: "2 tins chopped tomatoes", itemId: "chopped-tomatoes", need: 2, buy: 2 },
        { text: "1 tsp cumin", itemId: "", need: 1, buy: 1 },
      ],
    },
  ],
  recipeRows: {},
})

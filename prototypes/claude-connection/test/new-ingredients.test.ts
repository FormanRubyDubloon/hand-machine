// Ingredients the pantry doesn't have: named from the recipe's wording, flagged New until bought.
import { describe, expect, it } from "vitest"
import { merge, type Item, type Items } from "../../shopping-list/src/model"
import { guessPlace, ingredientName, normalise } from "../../pantry-app/src/model"
import { toItem, toRow, type Row } from "../../shared/src/rows"

const parsley = (over: Partial<Item> = {}): Item => ({
  id: "parsley", name: "Parsley", type: "counted", target: 0, inStock: 0, categoryId: "veg", where: [], review: true,
  entries: [{ source: { kind: "recipe", recipe: "Sardine linguine" }, qty: 1 }], ...over,
})

describe("ingredientName", () => {
  it("drops amounts, units and preparation", () => {
    expect(ingredientName("15g Parmesan, finely grated, plus extra to serve")).toBe("Parmesan")
    expect(ingredientName("a handful of parsley")).toBe("Parsley")
    expect(ingredientName("2 large handfuls of rocket")).toBe("Rocket")
    expect(ingredientName("1 tsp salt")).toBe("Salt")
  })
})

describe("guessPlace", () => {
  it("takes the category and location of the item sharing the most words", () => {
    const items = { a: { id: "a", name: "Fresh basil", type: "counted", target: 0, inStock: 1, categoryId: "veg", where: [], location: "fridge" } } as Items
    expect(guessPlace("Basil", items)).toEqual({ categoryId: "veg", location: "fridge" })
    expect(guessPlace("Saffron", items)).toEqual({ categoryId: "" })
  })
})

describe("New items", () => {
  const baseline: Items = { parsley: parsley() }
  it("stay New while none is in stock", () => {
    expect(normalise(parsley()).review).toBe(true)
  })
  it("stop being New once some is in stock", () => {
    expect(normalise(parsley({ inStock: 1 })).review).toBeUndefined()
  })
  it("lose the flag at the phone sync that brings stock in", () => {
    const out = merge({ parsley: parsley({ inStock: 1 }) }, baseline, baseline, {}).parsley
    expect(out.review).toBeUndefined()
    expect(out.inStock).toBe(1)
    expect(out.entries).toEqual([])
  })
  it("keep the flag if nothing was bought (ticked then undone)", () => {
    expect(merge(baseline, baseline, baseline, {}).parsley.review).toBe(true)
  })
  it("survive the round trip through Supabase rows", () => {
    const row = { ...toRow(parsley(), new Set(["veg"])), other_names: [], use_by: [], opened_at: [], list_entries: null } as unknown as Row
    expect(row.needs_review).toBe(true)
    expect(toItem(row).review).toBe(true)
  })
})

// The ingredients each recipe step names, for the cooking view (24 Nov 2026).
import { describe, expect, it } from "vitest"
import { ingredientsForStep, namingWords } from "../src/logic/steps"

const texts = (step: string, rows: { text: string; name?: string; otherNames?: string[] }[]) => ingredientsForStep(step, rows).map((r) => r.text)

describe("naming words", () => {
  it("drops amounts, units and describing words", () => {
    expect(namingWords("1 × 400 g tin chopped tomatoes")).toEqual(["tomato"])
    expect(namingWords("2 tbsp olive oil")).toEqual(["olive", "oil"])
    expect(namingWords("2 cloves garlic, crushed")).toEqual(["garlic"])
    expect(namingWords("1.5 kg plain flour")).toEqual(["flour"])
  })
})

describe("ingredients for a step", () => {
  const keema = [
    { text: "500 g minced beef", name: "Beef mince" },
    { text: "2 sweet potatoes", name: "Sweet potatoes" },
    { text: "2 carrots", name: "Carrots" },
    { text: "1 bag spinach", name: "Spinach" },
    { text: "1 onion", name: "Onions" },
    { text: "2 tsp garam masala", name: "Garam masala" },
    { text: "1 × 400 g tin chopped tomatoes", name: "Chopped tomatoes" },
  ]

  it("finds what a step names, singular or plural", () => {
    expect(texts("Peel and dice the sweet potatoes and carrots.", keema)).toEqual(["2 sweet potatoes", "2 carrots"])
    expect(texts("Stir in the garam masala, then the tomatoes, sweet potato and carrot. Simmer for 25 minutes.", keema))
      .toEqual(["2 sweet potatoes", "2 carrots", "2 tsp garam masala", "1 × 400 g tin chopped tomatoes"])
  })

  it("matches the pantry item's name when the step words it differently", () => {
    expect(texts("Add the mince and brown it, breaking it up as it cooks.", keema)).toEqual(["500 g minced beef"])
  })

  it("matches an item's other names", () => {
    expect(texts("Fry the scallions.", [{ text: "4 spring onions", name: "Spring onions", otherNames: ["Scallions"] }])).toEqual(["4 spring onions"])
  })

  it("doesn't match a describing word or part of a longer word", () => {
    const rows = [{ text: "2 tbsp olive oil", name: "Olive oil" }, { text: "1 red pepper", name: "Red pepper" }]
    expect(texts("Bring a pan of water to the boil.", rows)).toEqual([])
    expect(texts("Add the red lentils.", rows)).toEqual([])
  })

  it("finds nothing in a step that names no ingredient", () => {
    expect(texts("Serve at once.", keema)).toEqual([])
  })
})

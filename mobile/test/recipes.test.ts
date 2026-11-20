import { describe, expect, it } from "vitest"
import { demoState } from "../src/data/demo"
import { addAllMissing, addAisle, cooked, setIngredientQty, toggleWant, usedOne, openOne } from "../src/logic/actions"
import { phrase, expiryText } from "../src/logic/phrases"
import { day } from "../../prototypes/shared/src/pantry"

const keema = () => demoState().recipes.find((r) => r.id === "keema")!

describe("recipes", () => {
  it("Want to cook marks it and adds the shortfall, skipping what's already on the list", () => {
    const s = demoState()
    const { state, added } = toggleWant(s, keema())
    expect(state.recipes.find((r) => r.id === "keema")!.wantToCook).toBe(true)
    // Minced beef is out (and already on the list as a Staple), so nothing new goes on.
    expect(added).toBe(0)
  })

  it("Add all missing adds 1 of each short ingredient not on the list, including ones not in the pantry", () => {
    const s = demoState()
    const shakshuka = s.recipes.find((r) => r.id === "shakshuka")!
    const { state, added } = addAllMissing(s, shakshuka)
    expect(added).toBe(1)
    const feta = Object.values(state.items).find((i) => i.name === "Feta")!
    expect(feta.review).toBe(true)
    expect(state.recipes.find((r) => r.id === "shakshuka")!.ingredients[5].itemId).toBe(feta.id)
  })

  it("the stepper below 1 takes the recipe's entry off the list", () => {
    let s = setIngredientQty(demoState(), keema(), "carrots", 2)
    expect(s.items.carrots.entries?.[0]).toMatchObject({ qty: 2, source: { kind: "recipe", recipe: keema().name } })
    s = setIngredientQty(s, keema(), "carrots", 0)
    expect(s.items.carrots.entries ?? []).toEqual([])
  })

  it("Cooked it takes counted amounts off, and one pack (an open one first) for each finished bulk ingredient", () => {
    const s = cooked(demoState(), keema(), { carrots: 2, onions: 1 }, ["garam"])
    expect([s.items.carrots.inStock, s.items.onions.inStock, s.items.garam.inStock]).toEqual([3, 5, 0])
    expect(s.recipes.find((r) => r.id === "keema")!.lastCooked).toBeTruthy()
  })
})

describe("the pantry", () => {
  it("says stock the way a person would", () => {
    const s = demoState()
    expect(phrase(s.items.milk)).toBe("2 bottles, 1 open")
    expect(phrase(s.items.rice)).toBe("1 bag, open")
    expect(phrase(s.items.mince)).toBe("None left")
    expect(phrase(s.items.eggs)).toBe("4 eggs")
  })

  it("used one, open a pack", () => {
    let s = usedOne(demoState(), "eggs")
    expect(s.items.eggs.inStock).toBe(3)
    s = openOne(s, "flour")
    expect(phrase(s.items.flour)).toBe("1 bag, open")
  })

  it("use-by dates", () => {
    expect(expiryText(day(0))).toBe("Use by today")
    expect(expiryText(day(1))).toBe("Use by tomorrow")
    expect(expiryText(day(-1))).toBe("Past its use-by")
  })

  it("a new aisle joins every store, numbered only where it was added", () => {
    const made = addAisle(demoState(), "tesco", "World foods", 7)!
    expect(made.state.stores.find((x) => x.id === "tesco")!.aisles[made.id]).toBe(7)
    expect(made.state.stores.find((x) => x.id === "sainsburys")!.aisles[made.id]).toBeNull()
    expect(addAisle(made.state, "tesco", "world foods", 8)).toBeNull()
  })
})

// Insights (27 Nov 2026): the facts a change leaves on its History entry, and the sums Home's Insights view shows.
import { describe, expect, it } from "vitest"
import { factsOf, normalise, type Item } from "../../pantry-app/src/model"
import { insights, paceText, periodStart, type FactRow } from "../../pantry-app/src/insights-model"

const item = (over: Partial<Item> = {}): Item =>
  normalise({ id: "eggs", name: "Eggs", type: "counted", target: 6, inStock: 6, categoryId: "dairy", where: [], price: 30, ...over })

describe("factsOf", () => {
  it("counts a tick-off as bought, with the line's price, store and shop", () => {
    const facts = factsOf({ eggs: item() }, { eggs: item({ inStock: 8 }) }, { as: "shop", storeId: "s1", shopId: "shop1" })
    expect(facts).toEqual([{ kind: "bought", itemId: "eggs", qty: 2, pence: 60, estimate: undefined, storeId: "s1", shopId: "shop1" }])
  })

  it("nets out ticks taken back, and makes a negative buy when they're taken back later", () => {
    expect(factsOf({ eggs: item() }, { eggs: item() }, { as: "shop" })).toEqual([])
    expect(factsOf({ eggs: item({ inStock: 8 }) }, { eggs: item() }, { as: "shop" })[0]).toMatchObject({ kind: "bought", qty: -2, pence: -60 })
  })

  it("counts less stock as used, more as bought, for steppers and the item panel", () => {
    expect(factsOf({ eggs: item() }, { eggs: item({ inStock: 5 }) }, { as: "stock" })).toEqual([{ kind: "used", itemId: "eggs", qty: 1 }])
    expect(factsOf({ eggs: item() }, { eggs: item({ inStock: 7 }) }, { as: "stock" })[0]).toMatchObject({ kind: "bought", qty: 1 })
  })

  it("counts a throw-out with its value, and cooking with the stock it used", () => {
    expect(factsOf({ eggs: item({ priceEstimate: true }) }, { eggs: item({ priceEstimate: true, inStock: 4 }) }, { as: "threw" })).toEqual([{ kind: "threw", itemId: "eggs", qty: 2, pence: 60, estimate: true }])
    expect(factsOf({ eggs: item() }, { eggs: item({ inStock: 3 }) }, { as: "stock", cooked: "r1" })).toEqual([{ kind: "cooked", recipeId: "r1" }, { kind: "used", itemId: "eggs", qty: 3 }])
  })

  it("leaves out one-offs, deleted items and items with no price", () => {
    expect(factsOf({ x: item({ id: "x", oneOff: true }) }, { x: item({ id: "x", oneOff: true, inStock: 9 }) }, { as: "shop" })).toEqual([])
    expect(factsOf({ eggs: item() }, {}, { as: "stock" })).toEqual([])
    expect(factsOf({ eggs: item({ price: undefined }) }, { eggs: item({ price: undefined, inStock: 7 }) }, { as: "shop" })[0]).not.toHaveProperty("pence")
  })
})

describe("insights", () => {
  // Friday 27 November 2026, mid-afternoon.
  const now = new Date(2026, 10, 27, 15)
  const at = (month: number, day: number) => new Date(2026, month, day, 12).toISOString()
  const items = { eggs: item(), milk: item({ id: "milk", name: "Milk", categoryId: "dairy", price: 120 }), flour: item({ id: "flour", name: "Flour", categoryId: "baking", type: "bulk", unit: ["bag", "bags"] }) }
  const rows: FactRow[] = [
    { id: "1", at: at(9, 20), facts: [{ kind: "bought", itemId: "milk", qty: 1, pence: 120, shopId: "a", storeId: "sains" }] },
    { id: "2", at: at(10, 3), facts: [{ kind: "bought", itemId: "eggs", qty: 6, pence: 180, shopId: "b", storeId: "sains" }, { kind: "bought", itemId: "flour", qty: 1, pence: 150, shopId: "b", storeId: "sains", estimate: true }] },
    { id: "3", at: at(10, 24), facts: [{ kind: "bought", itemId: "milk", qty: 2, pence: 240, shopId: "c", storeId: "lidl" }] },
    { id: "4", at: at(10, 10), facts: [{ kind: "used", itemId: "eggs", qty: 2 }] },
    { id: "5", at: at(10, 12), facts: [{ kind: "used", itemId: "eggs", qty: 2 }, { kind: "cooked", recipeId: "r1" }] },
    { id: "6", at: at(10, 20), facts: [{ kind: "used", itemId: "eggs", qty: 2 }, { kind: "cooked", recipeId: "r1" }] },
    { id: "7", at: at(9, 2), facts: [{ kind: "cooked", recipeId: "r2" }] },
    { id: "8", at: at(10, 25), facts: [{ kind: "cooked", recipeId: "r2" }, { kind: "threw", itemId: "milk", qty: 1, pence: 120 }] },
    { id: "9", at: at(10, 26), undone: true, facts: [{ kind: "bought", itemId: "eggs", qty: 100, pence: 9999, shopId: "d", storeId: "lidl" }] },
  ]
  const i = insights(rows, items, "month", now)

  it("starts the week on Monday", () => {
    expect(periodStart("week", now).getDate()).toBe(23)
  })

  it("adds up spend this month against last, and leaves out undone entries", () => {
    expect(i.spent).toEqual({ pence: 570, before: 120, estimated: true, unpriced: 0 })
  })

  it("counts shops and where most were", () => {
    expect(i.shops).toEqual({ count: 2, average: 285, mostAt: "sains" })
  })

  it("counts meals, recipes and ones cooked for the first time", () => {
    expect(i.cooked).toEqual({ meals: 3, recipes: 2, first: 1 })
  })

  it("says what was thrown out and its share of what was bought", () => {
    expect(i.thrown).toMatchObject({ pence: 120, qty: 1, list: [{ itemId: "milk", qty: 1 }] })
    expect(i.thrown.share).toBeCloseTo(120 / 570)
  })

  it("draws eight weeks, this one last, and averages only weeks since the first fact", () => {
    expect(i.weeks).toHaveLength(8)
    expect(i.weeks[7].pence).toBe(240)
    expect(i.weeks.map((w) => w.pence).reduce((a, b) => a + b)).toBe(690)
    // The first fact (2 Oct) is in the oldest week, so all eight count.
    expect(i.weekAverage).toBe(Math.round(690 / 8))
    // Facts from 10 Nov only: three weeks (9, 16 and 23 Nov), with £2.40 spent.
    expect(insights(rows.filter((r) => ["3", "4", "5", "6", "8"].includes(r.id)), items, "month", now).weekAverage).toBe(80)
  })

  it("splits spend by first tag and lists the most used", () => {
    expect(i.byTag).toEqual([{ tagId: "dairy", pence: 420 }, { tagId: "baking", pence: 150 }])
    expect(i.usedMost).toEqual([{ itemId: "eggs", qty: 6 }])
  })

  it("gives a pace only after three uses", () => {
    expect(i.pace.map((p) => p.itemId)).toEqual(["eggs"])
    expect(paceText(items.eggs, 1)).toBe("About 1 a day")
    expect(paceText(items.eggs, 5 / 7)).toBe("5 a week")
    expect(paceText(items.flour, 1 / 35)).toBe("A bag every 5 weeks")
    expect(paceText(item({ unit: ["litre", "litres"] }), 0.5)).toBe("4 a week")
  })

  it("has nothing before the first fact", () => {
    expect(insights([], items, "week", now)).toMatchObject({ since: null, weekAverage: 0, spent: { pence: 0 } })
  })
})

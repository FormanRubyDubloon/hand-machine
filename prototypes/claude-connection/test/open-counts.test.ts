import { describe, expect, it } from "vitest"
import { shortfall, stockOf, type Item } from "../../pantry-app/src/model"

const flour: Item = { id: "flour", name: "Flour", type: "bulk", target: 2, inStock: 2, open: 1, categoryId: "baking", where: [] }

describe("open packs and the minimum, per item", () => {
  it("leaves an open pack out by default", () => {
    expect(shortfall(flour)).toBe(1)
    expect(stockOf(flour)).toBe("low")
  })

  it("counts it when the item says so", () => {
    const counted = { ...flour, openCounts: true }
    expect(shortfall(counted)).toBe(0)
    expect(stockOf(counted)).toBeNull()
  })
})

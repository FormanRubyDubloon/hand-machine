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

describe("Low status", () => {
  const eggs = (inStock: number, target = 6): Item => ({ id: "eggs", name: "Eggs", type: "counted", target, inStock, categoryId: "x", where: [] })

  it("is half the minimum or fewer", () => {
    expect(stockOf(eggs(4))).toBeNull()
    expect(stockOf(eggs(3))).toBe("low")
    expect(stockOf(eggs(1))).toBe("low")
    expect(stockOf(eggs(0))).toBe("out")
  })

  it("still counts as short of the minimum above half", () => {
    expect(shortfall(eggs(4))).toBe(2)
  })

  it("never shows Low for a minimum of 1, only Out", () => {
    expect(stockOf(eggs(1, 1))).toBeNull()
    expect(stockOf(eggs(0, 1))).toBe("out")
  })
})

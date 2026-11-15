import { afterEach, describe, expect, it } from "vitest"
import { shortfall, stockOf, type Item } from "../../pantry-app/src/model"
import { applySettings } from "../../shared/src/settings"

const flour: Item = { id: "flour", name: "Flour", type: "bulk", target: 2, inStock: 2, open: 1, categoryId: "baking", where: [] }

describe("open packs and the minimum", () => {
  afterEach(() => applySettings({ openCountsTowardsMinimum: false }))

  it("leaves an open pack out by default", () => {
    expect(shortfall(flour)).toBe(1)
    expect(stockOf(flour)).toBe("low")
  })

  it("counts it when the setting is on", () => {
    applySettings({ openCountsTowardsMinimum: true })
    expect(shortfall(flour)).toBe(0)
    expect(stockOf(flour)).toBeNull()
  })
})

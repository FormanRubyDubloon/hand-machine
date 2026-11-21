import { describe, expect, it } from "vitest"
import type { Item } from "../../prototypes/pantry-app/src/model"
import { mergeFields } from "../src/logic/merge"

const egg = (over: Partial<Item> = {}): Item => ({ id: "eggs", name: "Eggs", type: "counted", target: 6, inStock: 4, categoryId: "dairy", where: [], ...over })

describe("the chosen store on the phone", () => {
  it("takes a store chosen elsewhere", () => {
    const { item, clashes } = mergeFields(egg(), egg(), egg({ where: ["sainsburys"] }))
    expect(item.where).toEqual(["sainsburys"])
    expect(clashes).toEqual([])
  })

  it("is a clash when both sides choose different stores", () => {
    expect(mergeFields(egg({ where: ["tesco"] }), egg(), egg({ where: ["sainsburys"] })).clashes).toEqual(["where"])
  })
})

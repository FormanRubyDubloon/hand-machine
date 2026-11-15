// A shop in progress when the phone syncs: stock the pantry changed moves the shop's starting point,
// so Out and Low follow the pantry; what was ticked off on the phone still counts as got.
import { describe, expect, it } from "vitest"
import { listItem, syncStartStock, type Item, type Items, type Session } from "../src/model"

const tomatoes = (inStock: number): Item => ({ id: "tom", name: "Chopped tomatoes", target: 8, inStock, type: "counted", categoryId: "tins", where: [] })
const one = (i: Item): Items => ({ [i.id]: i })
const session = (startStock: Record<string, number>): Session => ({ storeId: "s", aisleIndex: 0, skipped: [], startStock, finished: false })

describe("starting stock after a sync mid-shop", () => {
  it("follows stock the pantry added: 0 to 7 of 8 isn't Out", () => {
    const start = syncStartStock({ tom: 0 }, one(tomatoes(0)), one(tomatoes(7)), one(tomatoes(7)))
    expect(start.tom).toBe(7)
    expect(listItem(tomatoes(7), session(start))).toMatchObject({ stock: null, needed: 1, got: 0 })
  })

  it("keeps what you ticked off on the phone as got", () => {
    // Started at 0, ticked 2 on the phone, pantry added 5 meanwhile.
    const start = syncStartStock({ tom: 0 }, one(tomatoes(2)), one(tomatoes(7)), one(tomatoes(7)))
    expect(start.tom).toBe(5)
    expect(listItem(tomatoes(7), session(start))).toMatchObject({ got: 2 })
  })

  it("leaves the start alone when the pantry didn't change the stock", () => {
    expect(syncStartStock({ tom: 3 }, one(tomatoes(5)), one(tomatoes(5)), one(tomatoes(5))).tom).toBe(3)
  })

  it("starts new items at their synced stock", () => {
    expect(syncStartStock({}, {}, one(tomatoes(4)), one(tomatoes(4))).tom).toBe(4)
  })
})

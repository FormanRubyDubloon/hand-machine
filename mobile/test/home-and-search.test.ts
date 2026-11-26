// Batch 5 (24 Nov 2026): Home's summary and the header's search.
import { describe, expect, it } from "vitest"
import { day } from "../../prototypes/shared/src/pantry"
import { demoState } from "../src/data/demo"
import type { PhoneState } from "../src/data/state"
import { homeSummary } from "../src/logic/home"
import { refreshShop } from "../src/logic/list"
import { RECENT, rememberSearch, searchAll } from "../src/logic/search"

const start = (): PhoneState => {
  const s = demoState()
  return { ...s, shop: refreshShop(null, s.items) }
}

describe("Home", () => {
  it("counts what's to buy, leaving out what's ordered", () => {
    const s = start()
    const n = homeSummary(s).toBuy
    expect(n).toBeGreaterThan(0)
    const eggs = { ...s.items.eggs, ordered: true }
    expect(homeSummary({ ...s, items: { ...s.items, eggs } }).toBuy).toBe(n - 1)
  })

  it("lists what to use soon, soonest first, and only what's in stock", () => {
    const s = start()
    const items = {
      ...s.items,
      eggs: { ...s.items.eggs, useBy: [day(1), day(9), day(9), day(9)] },
      cheddar: { ...s.items.cheddar, useBy: [day(0)] },
      sardines: { ...s.items.sardines, inStock: 0, useBy: [day(0)] },
    }
    const soon = homeSummary({ ...s, items }).useSoon.map((i) => i.id)
    expect(soon.indexOf("cheddar")).toBeLessThan(soon.indexOf("eggs"))
    expect(soon).not.toContain("sardines")
  })

  it("has the Want to cook recipes, A to Z, and what's new to review", () => {
    const s = start()
    const h = homeSummary(s)
    expect(h.wantToCook.map((r) => r.id)).toEqual(["linguine"])
    expect(h.toReview).toBe(1)
    expect(h.lowOrOut).toBeGreaterThan(0)
  })
})

describe("Search", () => {
  it("finds things on the list, in the pantry and in recipes", () => {
    const r = searchAll(start(), "egg")
    expect(r.list.map((i) => i.id)).toContain("eggs")
    expect(r.pantry.map((i) => i.id)).toContain("eggs")
    // Shakshuka has "4 eggs" among its ingredients.
    expect(r.recipes.map((x) => x.id)).toContain("shakshuka")
  })

  it("matches other names, not tags, and puts a name that starts with it first", () => {
    const s = start()
    expect(searchAll(s, "minced").pantry.map((i) => i.id)).toEqual(["mince"])
    // Butter is tagged Dairy & eggs, but it isn't an egg.
    expect(searchAll(s, "egg").pantry.map((i) => i.id)).toEqual(["eggs"])
    expect(searchAll(s, "ch").pantry[0].name).toMatch(/^Ch/)
  })

  it("leaves one-offs out of the pantry, and finds nothing for nothing", () => {
    const s = start()
    const r = searchAll(s, "candles")
    expect(r.list.map((i) => i.id)).toEqual(["candles"])
    expect(r.pantry).toEqual([])
    expect(searchAll(s, "  ")).toEqual({ list: [], pantry: [], recipes: [] })
  })
})

describe("Recent searches", () => {
  it("keeps the newest first, once each, and only so many", () => {
    let r = rememberSearch(undefined, " eggs ")
    r = rememberSearch(r, "rice")
    r = rememberSearch(r, "Eggs")
    expect(r).toEqual(["Eggs", "rice"])
    expect(rememberSearch(r, "  ")).toBe(r)
    for (let n = 0; n < 20; n++) r = rememberSearch(r, `thing ${n}`)
    expect(r).toHaveLength(RECENT)
    expect(r[0]).toBe("thing 19")
  })
})

// HOME-1 (26 Nov 2026): the greeting and the Tonight card's pick.
import { dateLine, greeting, tonightLabel, tonightLine, tonightPicks } from "../src/logic/home"
import type { RecipeRow } from "../src/logic/recipes"

describe("Home: greeting and Tonight", () => {
  it("greets by the time of day and says the date", () => {
    expect(greeting(new Date(2026, 10, 26, 9))).toBe("Good morning")
    expect(greeting(new Date(2026, 10, 26, 12))).toBe("Good afternoon")
    expect(greeting(new Date(2026, 10, 26, 17))).toBe("Good evening")
    expect(dateLine(new Date(2026, 10, 26, 9))).toBe("Thursday 26 November")
    expect(tonightLabel(new Date(2026, 10, 26, 14))).toBe("Today")
    expect(tonightLabel(new Date(2026, 10, 26, 15))).toBe("Tonight")
  })

  const r = (id: string, o: Partial<RecipeRow> & { minutes?: number; want?: boolean } = {}): RecipeRow => ({
    recipe: { id, name: id, serves: 2, minutes: o.minutes ?? 30, wantToCook: !!o.want, ingredients: [], method: [] } as unknown as RecipeRow["recipe"],
    short: o.short ?? 0, onList: 0, usesUp: o.usesUp ?? null,
  })

  it("offers only what you can cook: uses up first, then Want to cook, then quickest, then A to Z", () => {
    const rows = [
      r("short", { short: 1, usesUp: { name: "Parsley", date: "2026-11-26" } }),
      r("quick", { minutes: 10 }),
      r("notime", { minutes: 0 }),
      r("want", { want: true, minutes: 50 }),
      r("later", { usesUp: { name: "Milk", date: "2026-11-28" } }),
      r("sooner", { usesUp: { name: "Parsley", date: "2026-11-26" } }),
      r("b", { minutes: 20 }),
      r("a", { minutes: 20 }),
    ]
    expect(tonightPicks(rows).map((x) => x.recipe.id)).toEqual(["sooner", "later", "want", "quick", "a", "b", "notime"])
  })

  it("says the time, that you have everything, and what it uses up", () => {
    expect(tonightLine(r("x", { minutes: 25, usesUp: { name: "Parsley", date: "2026-11-26" } }))).toBe("25 min · you have everything, and it uses the parsley")
    expect(tonightLine(r("x", { minutes: 0 }))).toBe("you have everything")
  })
})

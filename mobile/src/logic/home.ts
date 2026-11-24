// Home (Batch 5, 24 Nov 2026): the first tab the app opens on. What's worth knowing at a glance: how much is on
// the list, what to use soon, what's low or out, what's new to review, and the recipes you want to cook. Pure, so
// it's tested (test/home.test.ts).
import { isStaple, needOf, soonest, stockOf, type Item, type Recipe } from "../../../prototypes/pantry-app/src/model"
import type { PhoneState } from "../data/state"
import { goingOffSoon } from "./phrases"

export type HomeSummary = {
  /** Things to buy: on the list and not already ordered. */
  toBuy: number
  /** In stock and past, or within two days of, its use-by, soonest first. */
  useSoon: Item[]
  /** Staples below their minimum or out. */
  lowOrOut: number
  /** New items waiting to be reviewed. */
  toReview: number
  /** Recipes marked Want to cook, A to Z. */
  wantToCook: Recipe[]
}

export function homeSummary(state: Pick<PhoneState, "items" | "recipes">): HomeSummary {
  const items = Object.values(state.items)
  const pantry = items.filter((i) => !i.oneOff)
  return {
    toBuy: items.filter((i) => needOf(i) > 0 && !i.ordered).length,
    useSoon: pantry.filter((i) => i.inStock > 0 && goingOffSoon(i)).sort((a, b) => (soonest(a) ?? "").localeCompare(soonest(b) ?? "") || a.name.localeCompare(b.name)),
    lowOrOut: pantry.filter((i) => isStaple(i) && stockOf(i) !== null).length,
    toReview: pantry.filter((i) => i.review).length,
    wantToCook: state.recipes.filter((r) => r.wantToCook).sort((a, b) => a.name.localeCompare(b.name)),
  }
}

// Home (Batch 5, 24 Nov 2026): the first tab the app opens on. What's worth knowing at a glance: how much is on
// the list, what to use soon, what's low or out, what's new to review, and the recipes you want to cook. Pure, so
// it's tested (test/home.test.ts).
import { isStaple, needOf, soonest, stockOf, type Item, type Recipe } from "../../../prototypes/pantry-app/src/model"
import type { PhoneState } from "../data/state"
import { minutesText } from "../../../prototypes/shared/src/pantry"
import { goingOffSoon } from "./phrases"
import type { RecipeRow } from "./recipes"

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

// ---------- HOME-1 (26 Nov 2026, claude/collca-home-1-handoff.zip) ----------

/** Good morning before 12:00, good afternoon from 12:00, good evening from 17:00, by the phone's clock. */
export const greeting = (now = new Date()) => {
  const h = now.getHours()
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"
}

/** "Thursday 26 November". */
export const dateLine = (now = new Date()) =>
  now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }).replace(",", "")

/** The card's label follows the time of day: Today before 15:00, Tonight from then (handoff section 9, item 6). */
export const tonightLabel = (now = new Date()) => (now.getHours() < 15 ? "Today" : "Tonight")

/**
 * The recipes Home's card can offer, best first: only those you can cook now; those that use something going off
 * first (soonest use-by first); then Want to cook; then the quickest (no time last); ties A to Z.
 */
export function tonightPicks(rows: RecipeRow[]): RecipeRow[] {
  const mins = (r: RecipeRow) => (r.recipe.minutes > 0 ? r.recipe.minutes : Infinity)
  return rows
    .filter((r) => r.short === 0)
    .sort((a, b) =>
      (a.usesUp ? 0 : 1) - (b.usesUp ? 0 : 1) ||
      (a.usesUp && b.usesUp ? a.usesUp.date.localeCompare(b.usesUp.date) : 0) ||
      Number(!!b.recipe.wantToCook) - Number(!!a.recipe.wantToCook) ||
      mins(a) - mins(b) ||
      a.recipe.name.localeCompare(b.recipe.name),
    )
}

/** "25 min · you have everything, and it uses the parsley". */
export const tonightLine = (r: RecipeRow) =>
  [r.recipe.minutes > 0 ? minutesText(r.recipe.minutes) : "", `you have everything${r.usesUp ? `, and it uses the ${r.usesUp.name.toLowerCase()}` : ""}`]
    .filter(Boolean)
    .join(" · ")

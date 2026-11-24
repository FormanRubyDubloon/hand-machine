// Browsing the pantry on the phone (Batch 2, 24 Nov 2026): in stock only unless you switch to everything,
// the locations that have something to show, and the all-items view's sorting and filters. Pure, so it's
// tested (test/pantry.test.ts).
import { isStaple, soonest, stockOf, type Item, type Location } from "../../../prototypes/pantry-app/src/model"
import type { PhoneState } from "../data/state"
import { goingOffSoon } from "./phrases"

/** In stock only is the default. `pantryAll` is the switch turned off: everything, out of stock included. */
export const inStockOnly = (s: Pick<PhoneState, "pantryAll">) => !s.pantryAll

/** The pantry's own items (not one-offs from the list), in stock only unless `all`. */
export function pantryItems(items: Record<string, Item>, all: boolean): Item[] {
  return Object.values(items).filter((i) => !i.oneOff && (all || i.inStock > 0))
}

/** How many items each location has, for the landing page. Locations with none aren't listed. */
export function locationCounts(items: Item[]): Map<Location | "none", number> {
  const out = new Map<Location | "none", number>()
  for (const i of items) out.set(i.location ?? "none", (out.get(i.location ?? "none") ?? 0) + 1)
  return out
}

export type PantrySort = "name" | "useBy" | "added"
export const SORTS: { value: PantrySort; label: string }[] = [
  { value: "name", label: "A–Z" },
  { value: "useBy", label: "Use by" },
  { value: "added", label: "Newest" },
]

const byName = (a: Item, b: Item) => a.name.localeCompare(b.name)
const compare: Record<PantrySort, (a: Item, b: Item) => number> = {
  name: byName,
  // Soonest use-by first; no date last.
  useBy: (a, b) => (soonest(a) ?? "9999").localeCompare(soonest(b) ?? "9999") || byName(a, b),
  // Newest first; no date last.
  added: (a, b) => (b.addedAt ?? "").localeCompare(a.addedAt ?? "") || byName(a, b),
}

export type PantryShow = "staples" | "soon" | "low" | "out"
export const SHOWS: { value: PantryShow; label: string }[] = [
  { value: "staples", label: "Staples" },
  { value: "soon", label: "Use soon" },
  { value: "low", label: "Low" },
  { value: "out", label: "Out" },
]
const shows: Record<PantryShow, (i: Item) => boolean> = {
  staples: isStaple,
  // The same "soon" as the landing page's location cards.
  soon: goingOffSoon,
  low: (i) => stockOf(i) === "low",
  out: (i) => i.inStock <= 0,
}

export type PantryView = { sort: PantrySort; location: Location | "none" | null; show: PantryShow | null }
export const defaultView: PantryView = { sort: "name", location: null, show: null }

/** How many of All items' filters are on: a location, a Show filter, and showing everything (not In stock only). */
export const pantryFiltersOn = (v: PantryView, all: boolean) => Number(v.location !== null) + Number(v.show !== null) + Number(all)

/** The all-items view: one location and one Show filter at most, then sorted. */
export function viewOf(items: Item[], v: PantryView): Item[] {
  return items
    .filter((i) => (v.location === null || (i.location ?? "none") === v.location) && (v.show === null || shows[v.show](i)))
    .sort(compare[v.sort])
}

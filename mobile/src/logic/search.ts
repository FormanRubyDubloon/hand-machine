// Search (Batch 5, 24 Nov 2026): one search, from the header, across what's on the list, the pantry and recipes.
// Pure, so it's tested (test/home-and-search.test.ts). Names and other names match anywhere; a match at the start of a
// word comes first. An ingredient's wording finds its recipe. Tags don't match: "egg" found everything tagged
// Dairy & eggs, which buried the eggs.
import { containsText, namesOf, needOf, type Item, type Recipe } from "../../../prototypes/pantry-app/src/model"
import type { PhoneState } from "../data/state"

export type SearchResults = { list: Item[]; pantry: Item[]; recipes: Recipe[] }

const startsWord = (text: string, q: string) => new RegExp(`(^|\\s)${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i").test(text)

/** Best first: a name starting with the words typed, then A to Z. */
function rank<T extends { name: string }>(xs: T[], q: string) {
  return xs.sort((a, b) => Number(startsWord(b.name, q)) - Number(startsWord(a.name, q)) || a.name.localeCompare(b.name))
}

/** How many recent searches are kept. */
export const RECENT = 8

/** Remembers a search: newest first, once each (ignoring case), at most RECENT. */
export function rememberSearch(recent: string[] | undefined, query: string): string[] {
  const q = query.trim()
  if (!q) return recent ?? []
  return [q, ...(recent ?? []).filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, RECENT)
}

export function searchAll(state: Pick<PhoneState, "items" | "recipes" | "shop">, query: string): SearchResults {
  const q = query.trim()
  if (!q) return { list: [], pantry: [], recipes: [] }
  const matches = (i: Item) => namesOf(i).some((n) => containsText(n, q))
  const items = Object.values(state.items).filter(matches)
  // On the list: in the shop in progress (ticked ones too), or needed now.
  const onList = items.filter((i) => !!state.shop?.rows[i.id] || needOf(i) > 0)
  return {
    list: rank(onList, q),
    pantry: rank(items.filter((i) => !i.oneOff), q),
    recipes: rank(state.recipes.filter((r) => containsText(r.name, q) || r.ingredients.some((g) => containsText(g.text, q))), q),
  }
}

// Aisle guesses (27 Nov 2026, Isaac's idea): the app learns where things go from the tags of items you've placed, and
// suggests aisles for the rest, in the aisle question and on Home. The guessing is shared (guessAisles in the pantry
// model); this is the phone's part: what's still to check, what you said no to, and how a guess is put. Pure, so it's
// tested (test/aisle-guesses.test.ts).
import { aisleKey, guessAisle, guessAisles, type AisleGuess, type Item, type Store } from "../../../prototypes/pantry-app/src/model"
import type { PhoneState } from "../data/state"
import { setItemAisle } from "./actions"

const noKey = (g: Pick<AisleGuess, "storeId" | "itemId">) => `${g.storeId}:${g.itemId}`
const saidNo = (s: Pick<PhoneState, "aisleNo">, g: AisleGuess) => s.aisleNo?.[noKey(g)] === aisleKey(g.aisle)

/** The store you're shopping in. */
const storeOf = (s: Pick<PhoneState, "stores" | "storeId">): Store | undefined => s.stores.find((x) => x.id === s.storeId) ?? s.stores[0]

/** Guesses for the store you're shopping in that you haven't said no to, A to Z. */
export function guessesToCheck(s: Pick<PhoneState, "items" | "stores" | "storeId" | "aisleNo">): AisleGuess[] {
  const store = storeOf(s)
  if (!store) return []
  return guessAisles(store, Object.values(s.items)).filter((g) => !saidNo(s, g))
}

/** The guess for one item in a store, unless you've said no to it. For the aisle question. */
export function guessFor(s: Pick<PhoneState, "items" | "aisleNo">, store: Store, item: Item): AisleGuess | null {
  const g = guessAisle(store, Object.values(s.items), item)
  return g && !saidNo(s, g) ? g : null
}

/** "Not this": the guess doesn't come back (a different one for the same item would). */
export const sayNo = (s: PhoneState, g: AisleGuess): PhoneState => ({ ...s, aisleNo: { ...s.aisleNo, [noKey(g)]: aisleKey(g.aisle) } })

/** Puts the guessed aisles on their items. */
export const acceptGuesses = (s: PhoneState, gs: AisleGuess[]): PhoneState => gs.reduce((t, g) => setItemAisle(t, g.itemId, g.storeId, g.aisle), s)

/** "4 of your 5 Tinned items are in aisle 7", "Both your Dairy items are at the Tills". */
export function guessReason(g: AisleGuess, tagName: string) {
  const where = typeof g.aisle === "number" ? `in aisle ${g.aisle}` : `at ${g.aisle}`
  const items = `${tagName} items`
  if (g.agree === g.of) return `${g.of === 2 ? "Both" : `All ${g.of} of`} your ${items} are ${where}`
  return `${g.agree} of your ${g.of} ${items} are ${where}`
}

// Aisle guesses as rows (27 Nov 2026): each item with no aisle in the store you're shopping in, the aisle its tags
// suggest and why, with Yes, Change (the aisle question) and Not this. The To review screen's Aisles tab.
import { router } from "expo-router"
import * as React from "react"
import { Text, View } from "react-native"
import { aisleTitle, type AisleGuess } from "../../../prototypes/pantry-app/src/model"
import { useStore } from "../data/store"
import { setItemAisle } from "../logic/actions"
import { acceptGuesses, guessesToCheck, guessReason, sayNo } from "../logic/aisle-guesses"
import { plural } from "../logic/phrases"
import { Caption, Press } from "./kit"
import { font, useColours } from "./theme"

/** The guesses to check, and the actions on them. */
export function useAisleGuesses() {
  const { state, change, local, say } = useStore()
  const store = state.stores.find((s) => s.id === state.storeId) ?? state.stores[0]
  const guesses = guessesToCheck(state)
  const nameOf = (g: AisleGuess) => state.items[g.itemId]?.name ?? ""
  const tagName = (g: AisleGuess) => state.categories.find((k) => k.id === g.tagId)?.name ?? "tagged"
  const undo = (gs: AisleGuess[]) => () =>
    change((s) => gs.reduce((t, g) => setItemAisle(t, g.itemId, g.storeId, null), s), { title: `Took back ${plural(gs.length, "guessed aisle")} at ${store?.name}` })
  const yes = (g: AisleGuess) => {
    const where = aisleTitle(g.aisle)
    change((s) => acceptGuesses(s, [g]), { title: `${nameOf(g)}: ${where.toLowerCase()} at ${store?.name}`, detail: "A guess from its tags, taken on the phone", key: `aisle:${g.storeId}:${g.itemId}` })
    say(`${nameOf(g)}: ${where} at ${store?.name}.`, undo([g]))
  }
  const all = () => {
    const gs = guesses
    change((s) => acceptGuesses(s, gs), { title: `${plural(gs.length, "aisle")} at ${store?.name} from guesses`, detail: gs.map((g) => `${nameOf(g)}: ${aisleTitle(g.aisle).toLowerCase()}`).join(", ") })
    say(`Set ${plural(gs.length, "aisle")} at ${store?.name}.`, undo(gs))
  }
  const no = (g: AisleGuess) => local((s) => sayNo(s, g))
  return { store, guesses, nameOf, tagName, yes, all, no }
}

export function AisleGuessRow({ g, onYes, onNo, name, tag }: { g: AisleGuess; onYes: () => void; onNo: () => void; name: string; tag: string }) {
  const c = useColours()
  return (
    <View style={{ gap: 6, borderBottomWidth: 1, borderBottomColor: c.line, paddingVertical: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 12 }}>
        <Text style={{ flex: 1, fontFamily: font.medium, fontSize: 18, color: c.ink }}>{name}</Text>
        <Text style={{ fontFamily: font.bold, fontSize: 18, color: c.ink }}>{aisleTitle(g.aisle)}</Text>
      </View>
      <Caption>{guessReason(g, tag)}.</Caption>
      <View style={{ flexDirection: "row", gap: 20, marginTop: 2 }}>
        <Press fade onPress={onYes} accessibilityLabel={`Yes, ${name} is in ${aisleTitle(g.aisle)}`} style={{ minHeight: 44, justifyContent: "center" }}>
          <Text style={{ fontFamily: font.semibold, fontSize: 15, color: c.primary }}>Yes</Text>
        </Press>
        <Press fade onPress={() => router.push({ pathname: "/aisle", params: { id: g.itemId, from: "edit", store: g.storeId } })} accessibilityLabel={`Choose another aisle for ${name}`} style={{ minHeight: 44, justifyContent: "center" }}>
          <Text style={{ fontFamily: font.semibold, fontSize: 15, color: c.primary }}>Change</Text>
        </Press>
        <Press fade onPress={onNo} accessibilityLabel={`Not ${aisleTitle(g.aisle)} for ${name}. Don't suggest it again`} style={{ minHeight: 44, justifyContent: "center" }}>
          <Text style={{ fontFamily: font.semibold, fontSize: 15, color: c.muted }}>Not this</Text>
        </Press>
      </View>
    </View>
  )
}

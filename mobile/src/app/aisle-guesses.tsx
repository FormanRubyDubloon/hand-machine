// Aisle guesses (sheet, from Home; 27 Nov 2026, Isaac's idea): items with no aisle in the store you're shopping in,
// each with the aisle its tags suggest and why. Yes takes it, Change opens the aisle question, Not this stops it
// coming back. Accept all takes the lot as one History entry, with Undo.
import { router } from "expo-router"
import * as React from "react"
import { ScrollView, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { aisleTitle, type AisleGuess } from "../../../prototypes/pantry-app/src/model"
import { useStore } from "../data/store"
import { setItemAisle } from "../logic/actions"
import { acceptGuesses, guessesToCheck, guessReason, sayNo } from "../logic/aisle-guesses"
import { plural } from "../logic/phrases"
import { Button, Caption, Press } from "../ui/kit"
import { SheetHeader } from "../ui/sheet"
import { font, useColours } from "../ui/theme"

export default function AisleGuesses() {
  const { state, change, local, say } = useStore()
  const c = useColours()
  const insets = useSafeAreaInsets()
  const store = state.stores.find((s) => s.id === state.storeId) ?? state.stores[0]
  const guesses = guessesToCheck(state)
  const tagName = (g: AisleGuess) => state.categories.find((k) => k.id === g.tagId)?.name ?? "tagged"
  const nameOf = (g: AisleGuess) => state.items[g.itemId]?.name ?? ""
  // The last one dealt with leaves nothing here, so the sheet closes.
  const after = () => guesses.length === 1 && router.back()

  const undoAll = (gs: AisleGuess[]) => () =>
    change((s) => gs.reduce((t, g) => setItemAisle(t, g.itemId, g.storeId, null), s), { title: `Took back ${plural(gs.length, "guessed aisle")} at ${store?.name}` })

  const yes = (g: AisleGuess) => {
    const where = aisleTitle(g.aisle)
    change((s) => acceptGuesses(s, [g]), { title: `${nameOf(g)}: ${where.toLowerCase()} at ${store?.name}`, detail: "A guess from its tags, taken on the phone", key: `aisle:${g.storeId}:${g.itemId}` })
    say(`${nameOf(g)}: ${where} at ${store?.name}.`, undoAll([g]))
    after()
  }
  const all = () => {
    const gs = guesses
    change((s) => acceptGuesses(s, gs), { title: `${plural(gs.length, "aisle")} at ${store?.name} from guesses`, detail: gs.map((g) => `${nameOf(g)}: ${aisleTitle(g.aisle).toLowerCase()}`).join(", ") })
    router.back()
    say(`Set ${plural(gs.length, "aisle")} at ${store?.name}.`, undoAll(gs))
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ paddingTop: 10 }}>
        <SheetHeader title="Aisle guesses" noDone />
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20, gap: 12 }}>
        <Caption style={{ fontSize: 15 }}>
          {guesses.length
            ? `At ${store?.name}, from where your other items with the same tags are. Check them before you take them.`
            : "No guesses to check."}
        </Caption>
        <View style={{ borderTopWidth: guesses.length ? 1 : 0, borderTopColor: c.line }}>
          {guesses.map((g) => (
            <View key={g.itemId} style={{ gap: 6, borderBottomWidth: 1, borderBottomColor: c.line, paddingVertical: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "baseline", gap: 12 }}>
                <Text style={{ flex: 1, fontFamily: font.medium, fontSize: 18, color: c.ink }}>{nameOf(g)}</Text>
                <Text style={{ fontFamily: font.bold, fontSize: 18, color: c.ink }}>{aisleTitle(g.aisle)}</Text>
              </View>
              <Caption>{guessReason(g, tagName(g))}.</Caption>
              <View style={{ flexDirection: "row", gap: 20, marginTop: 2 }}>
                <Press fade onPress={() => yes(g)} accessibilityLabel={`Yes, ${nameOf(g)} is in ${aisleTitle(g.aisle)}`} style={{ minHeight: 44, justifyContent: "center" }}>
                  <Text style={{ fontFamily: font.semibold, fontSize: 15, color: c.primary }}>Yes</Text>
                </Press>
                <Press fade onPress={() => router.push({ pathname: "/aisle", params: { id: g.itemId, from: "edit", store: g.storeId } })} accessibilityLabel={`Choose another aisle for ${nameOf(g)}`} style={{ minHeight: 44, justifyContent: "center" }}>
                  <Text style={{ fontFamily: font.semibold, fontSize: 15, color: c.primary }}>Change</Text>
                </Press>
                <Press fade onPress={() => { local((s) => sayNo(s, g)); after() }} accessibilityLabel={`Not ${aisleTitle(g.aisle)} for ${nameOf(g)}. Don't suggest it again`} style={{ minHeight: 44, justifyContent: "center" }}>
                  <Text style={{ fontFamily: font.semibold, fontSize: 15, color: c.muted }}>Not this</Text>
                </Press>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
      <View style={{ flexDirection: "row", gap: 12, paddingHorizontal: 20, paddingTop: 12, paddingBottom: insets.bottom + 12, borderTopWidth: 1, borderTopColor: c.line }}>
        <Button kind="secondary" label="Done" onPress={() => router.back()} style={{ flex: 1 }} />
        <Button label={guesses.length > 1 ? `Accept all ${guesses.length}` : "Accept"} disabled={!guesses.length} onPress={all} style={{ flex: 1 }} />
      </View>
    </View>
  )
}

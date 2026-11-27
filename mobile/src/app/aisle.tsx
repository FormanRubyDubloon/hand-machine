// Where's [item]? (the aisle sheet; Batch 4, 24 Nov 2026; heading is Isaac's wording, which works for plurals too). Opens by itself after ticking off something with no aisle in the store
// you're in (from: "tick"), or from an item's Aisle row (from: "edit"). Number tiles (the store's number of aisles,
// 20 unless set in its settings) and the store's named places (Freezer, Tills…) with Add a place. Higher went on
// 24 Nov 2026 (Isaac's change): Edit store, by the store's name, is where to set more aisles. When the item
// has no aisle and its tags make a clear guess (27 Nov 2026, src/logic/aisle-guesses.ts), the guessed tile is outlined
// and a line says why; one tap takes it. Skip leaves it blank; it asks again the next time the list opens.
import { router, useLocalSearchParams } from "expo-router"
import { Plus } from "lucide-react-native"
import * as React from "react"
import { ScrollView, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { aisleTiles, aisleTitle, itemAisle, type AisleValue } from "../../../prototypes/pantry-app/src/model"
import { useStore } from "../data/store"
import { restoreTicks, setItemAisle } from "../logic/actions"
import { guessFor, guessReason } from "../logic/aisle-guesses"
import { Button, Caption, Field, Label, Press, type FieldRef } from "../ui/kit"
import { SheetHeader } from "../ui/sheet"
import { font, radius, useColours } from "../ui/theme"

export default function AislePrompt() {
  // `store` is set when opened from a store's Aisles section; otherwise it's the store you're shopping in.
  // `got`: from a tick-off, how many had been got before it, so Undo can put the ticks back (the sheet covers the
  // tick's own toast and its Undo; Isaac's change, 24 Nov 2026).
  const { id, from, store: storeParam, got } = useLocalSearchParams<{ id: string; from?: "tick" | "edit"; store?: string; got?: string }>()
  const { state, change, say } = useStore()
  const c = useColours()
  const insets = useSafeAreaInsets()
  const item = state.items[id]
  const store = state.stores.find((s) => s.id === (storeParam ?? state.storeId)) ?? state.stores[0]
  const [entering, setEntering] = React.useState(false)
  const [text, setText] = React.useState("")
  const input = React.useRef<FieldRef>(null)
  React.useEffect(() => {
    if (entering) setTimeout(() => input.current?.focus(), 50)
  }, [entering])
  if (!item || !store) return null

  const current = itemAisle(item, store)
  // At least as far as the item's own aisle, in case the store's number of aisles was lowered after.
  const tiles = Math.max(aisleTiles(store, Object.values(state.items)), typeof current === "number" ? current : 0)
  const name = item.name.toLowerCase()
  const guess = current === null ? guessFor(state, store, item) : null
  const guessed = (a: AisleValue) => !!guess && (typeof a === "number" ? guess.aisle === a : typeof guess.aisle === "string" && guess.aisle.toLowerCase() === a.toLowerCase())
  const why = guess ? `Guess: ${guessReason(guess, state.categories.find((k) => k.id === guess.tagId)?.name ?? "tagged")}.` : ""

  const pick = (a: AisleValue | null) => {
    const where = a === null ? "no aisle" : typeof a === "number" ? `aisle ${a}` : a
    change((s) => setItemAisle(s, item.id, store.id, a), { title: `${item.name}: ${where} at ${store.name}`, detail: "Set on the phone", key: `aisle:${store.id}:${item.id}` })
    router.back()
    // Undo puts back the aisle it had (Isaac's change, 24 Nov 2026).
    say(a === null ? `${item.name}: no aisle at ${store.name}.` : `${item.name}: ${typeof a === "number" ? `aisle ${a}` : a} at ${store.name}.`, () =>
      change((s) => setItemAisle(s, item.id, store.id, current), { title: `${item.name}: ${current === null ? "no aisle" : aisleTitle(current).toLowerCase()} at ${store.name} again`, key: `aisle:${store.id}:${item.id}` }),
    )
  }
  const undoTick = () => {
    const before = Number(got)
    change((s) => restoreTicks(s, item.id, before), { title: `Took ${name} off what you got`, key: `shop:${item.id}` })
    router.back()
    say(`Undone: ${name} isn't ticked off.`)
  }
  const typed = text.trim() || null

  const tile = (label: string, on: boolean, onPress: () => void, a11y: string, wide = false, likely = false) => (
    <Press
      key={a11y}
      onPress={onPress}
      accessibilityLabel={likely ? `${a11y}, the guess` : a11y}
      accessibilityState={{ selected: on }}
      style={{
        width: wide ? undefined : "18%", flexGrow: wide ? 1 : 0, minWidth: wide ? "30%" : undefined, height: 56, paddingHorizontal: wide ? 12 : 0,
        borderRadius: radius.base, borderWidth: likely ? 2.5 : 1, borderColor: on || likely ? c.primary : c.stone, backgroundColor: on ? c.primary : c.panel,
        alignItems: "center", justifyContent: "center",
      }}
    >
      <Text numberOfLines={1} style={{ fontFamily: font.bold, fontSize: wide ? 16 : 20, color: on ? c.onPrimary : likely ? c.primary : c.ink }}>{label}</Text>
    </Press>
  )

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ paddingTop: 10 }}>
        <SheetHeader title={`Where's ${name}?`} noDone />
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20, gap: 16 }} keyboardShouldPersistTaps="handled">
        <View style={{ gap: 4 }}>
          <Caption style={{ fontSize: 15 }}>
            At {store.name}. {from === "tick" ? "Next time it's in that aisle on your list." : current !== null ? `Now: ${aisleTitle(current)}.` : "It has no aisle here yet."}
          </Caption>
          {!!guess && <Text style={{ fontFamily: font.semibold, fontSize: 15, lineHeight: 21, color: c.ink }}>{why}</Text>}
          {/* Settings opens over this sheet, so after changing the number of aisles or places you're back here to choose. */}
          <Press fade hitSlop={8} accessibilityRole="link" accessibilityLabel={`Edit ${store.name}: number of aisles, places and labels`} onPress={() => router.push({ pathname: "/settings/store/[id]", params: { id: store.id } })} style={{ alignSelf: "flex-start", minHeight: 32, justifyContent: "center" }}>
            <Text style={{ fontFamily: font.semibold, fontSize: 15, color: c.primary }}>Edit store</Text>
          </Press>
        </View>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "flex-start" }}>
          {Array.from({ length: tiles }, (_, k) => k + 1).map((k) => tile(String(k), current === k, () => pick(k), `Aisle ${k}`, false, guessed(k)))}
        </View>

        <View style={{ gap: 8 }}>
          <Label>Places</Label>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {(store.places ?? []).map((p) => tile(p, typeof current === "string" && current.toLowerCase() === p.toLowerCase(), () => pick(p), p, true, guessed(p)))}
            <Press
              onPress={() => { setText(""); setEntering(true) }}
              accessibilityLabel="Add a place, like Freezer or Tills"
              style={{ flexGrow: 1, minWidth: "30%", height: 56, paddingHorizontal: 12, borderRadius: radius.base, borderWidth: 1, borderStyle: "dashed", borderColor: c.stone, flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center" }}
            >
              <Plus size={18} color={c.ink} />
              <Text style={{ fontFamily: font.medium, fontSize: 16, color: c.ink }}>Add a place</Text>
            </Press>
          </View>
          {!(store.places ?? []).length && <Caption>Places are aisles with a name, such as Freezer or Tills. They come after the numbers.</Caption>}
        </View>

        {entering && (
          <View style={{ gap: 8 }}>
            <Field
              ref={input}
              label="Place"
              value={text}
              onChangeText={setText}
              placeholder="e.g. Freezer"
              returnKeyType="done"
              onSubmitEditing={() => typed !== null && pick(typed)}
            />
            <Button label={typed === null ? "Type a name" : `Use ${typed}`} disabled={typed === null} onPress={() => typed !== null && pick(typed)} />
          </View>
        )}
      </ScrollView>
      <View style={{ flexDirection: "row", gap: 12, paddingHorizontal: 20, paddingTop: 12, paddingBottom: insets.bottom + 12, borderTopWidth: 1, borderTopColor: c.line }}>
        {from !== "tick" && current !== null && <Button kind="secondary" label="Clear aisle" onPress={() => pick(null)} style={{ flex: 1 }} />}
        {from === "tick" && got !== undefined && <Button kind="secondary" label="Undo" accessibilityLabel={`Undo ticking off ${name}`} onPress={undoTick} style={{ flex: 1 }} />}
        <Button kind={from === "tick" ? "secondary" : "primary"} label={from === "tick" ? "Skip" : "Done"} onPress={() => router.back()} style={{ flex: 1 }} />
      </View>
    </View>
  )
}

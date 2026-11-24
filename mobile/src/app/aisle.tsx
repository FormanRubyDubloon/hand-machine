// Where's [item]? (the aisle sheet; Batch 4, 24 Nov 2026; heading is Isaac's wording, which works for plurals too). Opens by itself after ticking off something with no aisle in the store
// you're in (from: "tick"), or from an item's Aisle row (from: "edit"). Number tiles (the store's number of aisles,
// 20 unless set in its settings), a field for a higher number, and the store's named places (Freezer, Tills…) with Add a place. It starts blank:
// nothing is guessed from tags. Skip leaves it blank; it asks again the next time the list opens.
import { router, useLocalSearchParams } from "expo-router"
import { Plus } from "lucide-react-native"
import * as React from "react"
import { ScrollView, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { aisleTiles, aisleTitle, itemAisle, type AisleValue } from "../../../prototypes/pantry-app/src/model"
import { useStore } from "../data/store"
import { setItemAisle } from "../logic/actions"
import { Button, Caption, Field, Label, Press, type FieldRef } from "../ui/kit"
import { SheetHeader } from "../ui/sheet"
import { font, radius, useColours } from "../ui/theme"

export default function AislePrompt() {
  // `store` is set when opened from a store's Aisles section; otherwise it's the store you're shopping in.
  const { id, from, store: storeParam } = useLocalSearchParams<{ id: string; from?: "tick" | "edit"; store?: string }>()
  const { state, change, say } = useStore()
  const c = useColours()
  const insets = useSafeAreaInsets()
  const item = state.items[id]
  const store = state.stores.find((s) => s.id === (storeParam ?? state.storeId)) ?? state.stores[0]
  const [entering, setEntering] = React.useState<"number" | "place" | null>(null)
  const [text, setText] = React.useState("")
  const input = React.useRef<FieldRef>(null)
  React.useEffect(() => {
    if (entering) setTimeout(() => input.current?.focus(), 50)
  }, [entering])
  if (!item || !store) return null

  const current = itemAisle(item, store)
  const tiles = aisleTiles(store, Object.values(state.items))
  const name = item.name.toLowerCase()

  const pick = (a: AisleValue | null) => {
    const where = a === null ? "no aisle" : typeof a === "number" ? `aisle ${a}` : a
    change((s) => setItemAisle(s, item.id, store.id, a), { title: `${item.name}: ${where} at ${store.name}`, detail: "Set on the phone", key: `aisle:${store.id}:${item.id}` })
    router.back()
    say(a === null ? `${item.name}: no aisle at ${store.name}.` : `${item.name}: ${typeof a === "number" ? `aisle ${a}` : a} at ${store.name}.`)
  }
  const n = Number(text.trim())
  const typed = entering === "number" ? (Number.isInteger(n) && n > 0 ? n : null) : text.trim() || null

  const tile = (label: string, on: boolean, onPress: () => void, a11y: string, wide = false) => (
    <Press
      key={a11y}
      onPress={onPress}
      accessibilityLabel={a11y}
      accessibilityState={{ selected: on }}
      style={{
        width: wide ? undefined : "18%", flexGrow: wide ? 1 : 0, minWidth: wide ? "30%" : undefined, height: 56, paddingHorizontal: wide ? 12 : 0,
        borderRadius: radius.base, borderWidth: 1, borderColor: on ? c.olive : c.stone, backgroundColor: on ? c.olive : c.panel,
        alignItems: "center", justifyContent: "center",
      }}
    >
      <Text numberOfLines={1} style={{ fontFamily: font.bold, fontSize: wide ? 16 : 20, color: on ? c.onOlive : c.ink }}>{label}</Text>
    </Press>
  )

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ paddingTop: 10 }}>
        <SheetHeader title={`Where's ${name}?`} noDone />
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20, gap: 16 }} keyboardShouldPersistTaps="handled">
        <Caption style={{ fontSize: 15 }}>
          At {store.name}. {from === "tick" ? "Next time it's in that aisle on your list." : current !== null ? `Now: ${aisleTitle(current)}.` : "It has no aisle here yet."}
        </Caption>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "flex-start" }}>
          {Array.from({ length: tiles }, (_, k) => k + 1).map((k) => tile(String(k), current === k, () => pick(k), `Aisle ${k}`))}
          {tile("Higher", entering === "number", () => { setText(""); setEntering("number") }, "A higher aisle number", true)}
        </View>

        <View style={{ gap: 8 }}>
          <Label>Places</Label>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {(store.places ?? []).map((p) => tile(p, typeof current === "string" && current.toLowerCase() === p.toLowerCase(), () => pick(p), p, true))}
            <Press
              onPress={() => { setText(""); setEntering("place") }}
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
              label={entering === "number" ? "Aisle number" : "Place"}
              value={text}
              onChangeText={setText}
              keyboardType={entering === "number" ? "number-pad" : "default"}
              placeholder={entering === "number" ? `${tiles + 1} or more` : "e.g. Freezer"}
              returnKeyType="done"
              onSubmitEditing={() => typed !== null && pick(typed)}
            />
            <Button label={typed === null ? (entering === "number" ? "Type a number" : "Type a name") : `Use ${typeof typed === "number" ? `aisle ${typed}` : typed}`} disabled={typed === null} onPress={() => typed !== null && pick(typed)} />
          </View>
        )}
      </ScrollView>
      <View style={{ flexDirection: "row", gap: 12, paddingHorizontal: 20, paddingTop: 12, paddingBottom: insets.bottom + 12, borderTopWidth: 1, borderTopColor: c.line }}>
        {from !== "tick" && current !== null && <Button kind="secondary" label="Clear aisle" onPress={() => pick(null)} style={{ flex: 1 }} />}
        <Button kind={from === "tick" ? "secondary" : "primary"} label={from === "tick" ? "Skip" : "Done"} onPress={() => router.back()} style={{ flex: 1 }} />
      </View>
    </View>
  )
}

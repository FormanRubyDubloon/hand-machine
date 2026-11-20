// The item sheet (full screen, always dark): what's in the pantry, the minimum, how many to get, a note, and
// Got all / Remove from list. Things not in the pantry yet get an aisle picker instead of stock.
import { router, useLocalSearchParams } from "expo-router"
import * as React from "react"
import { ScrollView, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { isBulk, isStaple } from "../../../../prototypes/pantry-app/src/model"
import { useStore } from "../../data/store"
import { removeFromList, restoreTicks, setCategory, setListNote, setToGet, tickAll, untick } from "../../logic/actions"
import { aislesOf, tickedText, rowsOf } from "../../logic/list"
import { minText, phrase } from "../../logic/phrases"
import { AislePicker, Button, Field, Press, Stepper } from "../../ui/kit"
import { focus, font, radius } from "../../ui/theme"

export default function ListItemSheet() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { state, change, say } = useStore()
  const insets = useSafeAreaInsets()
  const row = rowsOf(state).find((r) => r.id === id)
  const item = state.items[id]
  const [note, setNote] = React.useState(item?.notes ?? "")

  if (!item || !row) {
    return (
      <View style={{ flex: 1, backgroundColor: focus.bg, paddingTop: insets.top + 12, paddingHorizontal: 20 }}>
        <Text style={{ fontFamily: font.regular, fontSize: 17, color: focus.ink }}>This isn't on the list any more.</Text>
        <Button kind="gold" label="Done" onPress={() => router.back()} style={{ marginTop: 20 }} />
      </View>
    )
  }

  const store = state.stores.find((s) => s.id === state.storeId) ?? state.stores[0]
  const cat = state.categories.find((k) => k.id === item.categoryId)
  const num = store?.aisles[item.categoryId]
  const where = `${num ? `Aisle ${num}` : "No aisle number"} · ${cat?.name ?? "No aisle"}`
  const notInPantry = !!row.isNew && item.inStock - row.got <= 0
  const handAdded = (row.item.entries ?? []).length > 0 || !isStaple(item)
  const openNote = isBulk(item) && isStaple(item) && (item.open ?? 0) > 0 && !item.openCounts
  const counts = isBulk(item) && !item.openCounts ? item.inStock - (item.open ?? 0) : item.inStock
  const recipeNote = (item.entries ?? []).find((e) => e.source.kind === "recipe")
  const options = aislesOf(store, state.categories).flatMap((a) => a.categories.filter((k) => k.id).map((k) => ({ id: k.id, num: a.number ? `Aisle ${a.number}` : "–", name: k.name })))

  const close = () => {
    if (handAdded && note !== (item.notes ?? "")) change((s) => setListNote(s, id, note), { title: `Changed the note on ${item.name.toLowerCase()}` })
    router.back()
  }
  const gotAll = () => {
    if (row.done) {
      change((s) => untick(s, id), { title: `Took ${item.name.toLowerCase()} off what you got`, key: `shop:${id}` })
      return
    }
    const before = row.got
    change((s) => tickAll(s, id), { title: `Got ${item.name.toLowerCase()} on the phone`, key: `shop:${id}` })
    router.back()
    say(tickedText(row, row.need), () => change((s) => restoreTicks(s, id, before), { title: `Took ${item.name.toLowerCase()} off what you got`, key: `shop:${id}` }))
  }

  return (
    <View style={{ flex: 1, backgroundColor: focus.bg }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ flex: 1, fontFamily: font.semibold, fontSize: 13, letterSpacing: 1.2, textTransform: "uppercase", color: focus.place }}>{where}</Text>
        <Press fade onPress={close} accessibilityLabel="Done" style={{ minHeight: 44, minWidth: 64, alignItems: "flex-end", justifyContent: "center" }}>
          <Text style={{ fontFamily: font.semibold, fontSize: 16, color: focus.gold }}>Done</Text>
        </Press>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        <Text accessibilityRole="header" style={{ fontFamily: font.serif, fontWeight: "700", fontSize: 34, lineHeight: 37, letterSpacing: 1.2, textTransform: "uppercase", color: focus.ink }}>{item.name}</Text>

        {notInPantry ? (
          <Text style={{ fontFamily: font.regular, fontSize: 16, lineHeight: 22, color: focus.ink }}>Not in your pantry yet. It joins your pantry once you tick it off.</Text>
        ) : (
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Box label="In the pantry now" value={item.inStock > 0 ? phrase(item) : "None"} />
              <Box label="Minimum to keep" value={minText(item)} />
            </View>
            {openNote && <Text style={{ fontFamily: font.regular, fontSize: 14, lineHeight: 19, color: focus.label }}>Only full {item.unit?.[1] ?? "packs"} count towards the minimum, so you have {counts} that {counts === 1 ? "counts" : "count"}.</Text>}
          </View>
        )}

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ fontFamily: font.semibold, fontSize: 13, letterSpacing: 1.2, textTransform: "uppercase", color: focus.label }}>To get</Text>
          <Stepper dark label="How many to get" value={row.need} min={Math.max(1, row.got + 1)} onChange={(n) => change((s) => setToGet(s, id, n - row.got), { title: `${item.name} on the list: ${n}`, key: `toget:${id}` })} />
        </View>

        {handAdded ? (
          <Field dark label="Note" value={note} onChangeText={setNote} placeholder="Brand, size, what it's for" multiline style={{ minHeight: 64 }} />
        ) : (
          <View style={{ gap: 4 }}>
            <Text style={{ fontFamily: font.semibold, fontSize: 13, letterSpacing: 1.2, textTransform: "uppercase", color: focus.label }}>Why it's on the list</Text>
            <Text style={{ fontFamily: font.regular, fontSize: 16, color: focus.ink }}>{recipeNote && recipeNote.source.kind === "recipe" ? `For ${recipeNote.source.recipe}` : row.note}</Text>
          </View>
        )}

        {notInPantry && (
          <AislePicker dark label="Aisle" value={item.categoryId} options={options} onPick={(k) => change((s) => setCategory(s, id, k), { title: `Moved ${item.name.toLowerCase()} to ${state.categories.find((x) => x.id === k)?.name}` })} />
        )}
      </ScrollView>
      <View style={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 16, gap: 8 }}>
        <Button kind="gold" height={64} label={row.done ? "Not got it" : `Got all (${row.need})`} onPress={gotAll} />
        <Press
          fade
          onPress={() => {
            change((s) => removeFromList(s, id), { title: `Took ${item.name} off the shopping list` })
            router.back()
            say(`Took ${item.name.toLowerCase()} off the list.`)
          }}
          style={{ minHeight: 48, alignItems: "center", justifyContent: "center" }}
        >
          <Text style={{ fontFamily: font.semibold, fontSize: 15, letterSpacing: 0.9, textTransform: "uppercase", color: focus.danger }}>Remove from list</Text>
        </Press>
      </View>
    </View>
  )
}

function Box({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, borderWidth: 1, borderColor: focus.line, borderRadius: radius.base, padding: 12, gap: 4 }}>
      <Text style={{ fontFamily: font.semibold, fontSize: 12, letterSpacing: 1, textTransform: "uppercase", color: focus.label }}>{label}</Text>
      <Text accessibilityLiveRegion="polite" style={{ fontFamily: font.semibold, fontSize: 18, color: focus.ink }}>{value}</Text>
    </View>
  )
}

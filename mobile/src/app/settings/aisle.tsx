// Settings › a store › an aisle (Isaac's change, 24 Nov 2026): its label ("Dairy and eggs"), and the items you've
// put in it at this store. Tap an item to move it to another aisle or clear it. The label saves as you go.
import { router, useLocalSearchParams } from "expo-router"
import { ChevronRight } from "lucide-react-native"
import * as React from "react"
import { ScrollView, Text, View } from "react-native"
import { aisleLabel, aisleTitle, storeAisles, type AisleValue } from "../../../../prototypes/pantry-app/src/model"
import { useStore } from "../../data/store"
import { setAisleLabel } from "../../logic/actions"
import { plural } from "../../logic/phrases"
import { Caption, Display, Field, Label, Press } from "../../ui/kit"
import { useLeaveSettings } from "../../ui/leave-settings"
import { SheetHeader } from "../../ui/sheet"
import { font, useColours } from "../../ui/theme"

export default function AislePage() {
  const { store: storeId, aisle: raw } = useLocalSearchParams<{ store: string; aisle: string }>()
  const { state, change } = useStore()
  const c = useColours()
  const leave = useLeaveSettings()
  const store = state.stores.find((s) => s.id === storeId)
  const aisle: AisleValue = /^\d+$/.test(raw) ? Number(raw) : raw
  const [label, setLabel] = React.useState(aisleLabel(store, aisle) ?? "")
  if (!store) return null
  const same = (a: AisleValue) => (typeof a === "number" ? a === aisle : typeof aisle === "string" && a.toLowerCase() === aisle.toLowerCase())
  const items = storeAisles(store, Object.values(state.items).filter((i) => !i.oneOff)).find((g) => same(g.aisle))?.items ?? []
  const title = aisleTitle(aisle)

  function save() {
    if (store && label.trim() !== (aisleLabel(store, aisle) ?? "")) {
      change((s) => setAisleLabel(s, store.id, aisle, label), { title: label.trim() ? `${store.name}: ${title} labelled ${label.trim()}` : `${store.name}: took the label off ${title}`, key: `aisle-label:${store.id}:${raw}` })
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <SheetHeader back={{ label: store.name, onPress: () => { save(); router.back() } }} full onDone={() => { save(); leave() }} />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
        <Display size={30}>{title}</Display>
        <View style={{ gap: 6 }}>
          <Field label="Label" value={label} onChangeText={setLabel} onBlur={save} onSubmitEditing={save} returnKeyType="done" placeholder="e.g. Dairy and eggs" />
          <Caption>Shown with {title} on your list, so you know what's there.</Caption>
        </View>

        <View style={{ gap: 4 }}>
          <Label>{plural(items.length, "item")}</Label>
          <Caption>{items.length ? "Tap one to move it to another aisle, or clear it." : "Nothing's in this aisle any more."}</Caption>
        </View>
        <View style={{ borderTopWidth: items.length ? 1 : 0, borderTopColor: c.line }}>
          {items.map((i) => (
            <Press key={i.id} fade onPress={() => router.push({ pathname: "/aisle", params: { id: i.id, from: "edit", store: store.id } })} accessibilityLabel={`${i.name}. Change its aisle`} style={{ minHeight: 56, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: c.line }}>
              <Text style={{ flex: 1, fontFamily: font.medium, fontSize: 17, color: c.ink }}>{i.name}</Text>
              <ChevronRight size={20} color={c.muted} />
            </Press>
          ))}
        </View>
      </ScrollView>
    </View>
  )
}

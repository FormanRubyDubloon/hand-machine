// Settings › a store: its name, Shop here now, its aisle numbers (aisles that share a number are walked together),
// Add an aisle, and Remove this store (asks first; the only store can't go).
import { router, useLocalSearchParams } from "expo-router"
import * as React from "react"
import { ScrollView, Text, View } from "react-native"
import { categoriesAtoZ } from "../../../../../prototypes/pantry-app/src/model"
import { useStore } from "../../../data/store"
import { addAisle, chooseStore, removeStore, renameStore, setAisleNumber } from "../../../logic/actions"
import { plural } from "../../../logic/phrases"
import { Body, Button, Caption, Field, InfoBox, Label, Stepper } from "../../../ui/kit"
import { SheetHeader } from "../../../ui/sheet"
import { font, useColours } from "../../../ui/theme"

export default function StorePage() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { state, change, local, say } = useStore()
  const c = useColours()
  const store = state.stores.find((s) => s.id === id)
  const [name, setName] = React.useState(store?.name ?? "")
  const [aisle, setAisle] = React.useState("")
  const [asking, setAsking] = React.useState(false)
  if (!store) return null
  const current = store.id === state.storeId
  const count = (catId: string) => Object.values(state.items).filter((i) => !i.oneOff && i.categoryId === catId).length
  const highest = Math.max(0, ...Object.values(store.aisles).map((n) => n ?? 0))

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <SheetHeader back={{ label: "Stores", onPress: () => router.back() }} full onDone={() => router.dismissAll()} />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
        <Field label="Name" value={name} onChangeText={setName} onBlur={() => name.trim() && name.trim() !== store.name && change((s) => renameStore(s, store.id, name), { title: `Renamed a store to ${name.trim()}` })} />
        {current ? <Caption style={{ fontSize: 15 }}>You're shopping here now.</Caption> : <Button kind="secondary" label="Shop here now" onPress={() => { local((s) => chooseStore(s, store.id)); say(`Shopping at ${store.name}.`) }} />}

        <View style={{ gap: 4 }}>
          <Label>Aisle numbers</Label>
          <Caption>{plural(new Set(Object.values(store.aisles).filter((n) => n != null && n > 0)).size, "number")} in use. “–” means no number.</Caption>
        </View>
        <View style={{ borderTopWidth: 1, borderTopColor: c.line }}>
          {categoriesAtoZ(state.categories).map((k) => {
            const n = store.aisles[k.id] ?? 0
            return (
              <View key={k.id} style={{ minHeight: 64, flexDirection: "row", alignItems: "center", gap: 10, borderBottomWidth: 1, borderBottomColor: c.line, paddingVertical: 6 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: font.medium, fontSize: 17, color: c.ink }}>{k.name}</Text>
                  <Caption>{plural(count(k.id), "item")}</Caption>
                </View>
                <Stepper label={`Aisle number for ${k.name}`} value={n} min={0} display={n ? String(n) : "–"} onChange={(v) => change((s) => setAisleNumber(s, store.id, k.id, v), { title: `${store.name}: ${k.name} in aisle ${v || "none"}`, key: `aisle:${store.id}:${k.id}` })} />
              </View>
            )
          })}
        </View>
        <View style={{ gap: 8 }}>
          <Field label="Add an aisle" value={aisle} onChangeText={setAisle} placeholder="e.g. World foods" />
          <Button
            kind="secondary"
            label="Add"
            disabled={!aisle.trim()}
            onPress={() => {
              const made = addAisle(state, store.id, aisle, highest + 1)
              if (!made) {
                say(`There's already an aisle called ${aisle.trim()}.`)
                return
              }
              change(() => made.state, { title: `Added an aisle: ${aisle.trim()}` })
              say(`${aisle.trim()} added as aisle ${highest + 1} here, and to every other store with no number.`)
              setAisle("")
            }}
          />
          <Caption>Aisles that share a number are walked together on your list. A new aisle appears in every store, with no number until you set one.</Caption>
        </View>

        {state.stores.length <= 1 ? (
          <Caption>You need at least one store, so this one can't be removed.</Caption>
        ) : asking ? (
          <InfoBox>
            <Body>Remove {store.name}? Its aisle numbers go too. Your items and list stay as they are.</Body>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Button kind="dangerFill" label="Remove" style={{ flex: 1 }} onPress={() => { change((s) => removeStore(s, store.id), { title: `Removed the store ${store.name}` }); router.back(); say(`Removed ${store.name}.`) }} />
              <Button kind="secondary" label="Keep it" style={{ flex: 1 }} onPress={() => setAsking(false)} />
            </View>
          </InfoBox>
        ) : (
          <Button kind="danger" label="Remove this store" onPress={() => setAsking(true)} />
        )}
      </ScrollView>
    </View>
  )
}

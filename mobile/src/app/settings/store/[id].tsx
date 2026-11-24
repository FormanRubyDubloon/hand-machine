// Settings › a store: its name, Shop here now, its Aisles (what each item's aisle is here, learned at tick-offs, for
// fixing mistakes; Batch 4, 24 Nov 2026), its named places, and Remove this store (asks first; the only store can't go).
import { router, useLocalSearchParams } from "expo-router"
import * as React from "react"
import { ScrollView, Text, View } from "react-native"
import { ChevronRight, X } from "lucide-react-native"
import { aisleLabel, aisleTitle, DEFAULT_AISLES, storeAisles } from "../../../../../prototypes/pantry-app/src/model"
import { useStore } from "../../../data/store"
import { addPlace, chooseStore, removePlace, removeStore, renameStore, setAisleCount } from "../../../logic/actions"
import { plural } from "../../../logic/phrases"
import { Body, Button, Caption, Chip, Field, InfoBox, Label, Press, Stepper } from "../../../ui/kit"
import { useLeaveSettings } from "../../../ui/leave-settings"
import { SheetHeader } from "../../../ui/sheet"
import { font, useColours } from "../../../ui/theme"

export default function StorePage() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { state, change, local, say } = useStore()
  const c = useColours()
  const store = state.stores.find((s) => s.id === id)
  const [name, setName] = React.useState(store?.name ?? "")
  const [place, setPlace] = React.useState("")
  const [asking, setAsking] = React.useState(false)
  const leave = useLeaveSettings()
  if (!store) return null
  // The name saves as you go: on leaving the field, and on Done in case the field still has focus.
  function saveName() {
    if (store && name.trim() && name.trim() !== store.name) change((s) => renameStore(s, store.id, name), { title: `Renamed a store to ${name.trim()}` })
  }
  const current = store.id === state.storeId
  const aisles = storeAisles(store, Object.values(state.items).filter((i) => !i.oneOff))

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <SheetHeader back={{ label: "Stores", onPress: () => router.back() }} full onDone={() => { saveName(); leave(place.trim()) }} />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
        <Field label="Name" value={name} onChangeText={setName} onBlur={saveName} />
        {current ? <Caption style={{ fontSize: 15 }}>You're shopping here now.</Caption> : <Button kind="secondary" label="Shop here now" onPress={() => { local((s) => chooseStore(s, store.id)); say(`Shopping at ${store.name}.`) }} />}

        {store.noAisleNumbers ? (
          <View style={{ gap: 4 }}>
            <Label>No aisle numbers</Label>
            <Caption>This store's list goes A to Z, and it never asks which aisle something was in. Change this in Collca on the web, under Settings, Stores.</Caption>
          </View>
        ) : (
          <>
            {/* Isaac's change, 24 Nov 2026: the aisle question shows this many number tiles. */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Label>Number of aisles</Label>
                <Caption>The numbers offered when it asks which aisle something is in.</Caption>
              </View>
              <Stepper
                label="Number of aisles"
                value={store.aisleCount ?? DEFAULT_AISLES}
                min={1}
                max={200}
                onChange={(n) => change((s) => setAisleCount(s, store.id, n), { title: `${store.name}: ${n} aisles`, key: `aisles:${store.id}` })}
              />
            </View>

            <View style={{ gap: 4 }}>
              <Label>Aisles</Label>
              <Caption>{aisles.length ? "What you've told it so far. Tap an aisle to label it or fix what's in it." : "None yet. They fill in as you tick things off here."}</Caption>
            </View>
            {/* One row per aisle; its items and label are on their own screen (Isaac's change, 24 Nov 2026). */}
            {aisles.length > 0 && (
              <View style={{ borderTopWidth: 1, borderTopColor: c.line }}>
                {aisles.map((a) => {
                  const label = aisleLabel(store, a.aisle)
                  return (
                    <Press key={String(a.aisle)} fade onPress={() => router.push({ pathname: "/settings/aisle", params: { store: store.id, aisle: String(a.aisle) } })} accessibilityLabel={`${aisleTitle(a.aisle)}${label ? `, ${label}` : ""}, ${plural(a.items.length, "item")}. Open`} style={{ minHeight: 64, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1, borderBottomColor: c.line, paddingVertical: 8 }}>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={{ fontFamily: font.medium, fontSize: 18, color: c.ink }}>{aisleTitle(a.aisle)}</Text>
                        <Caption>{[label, plural(a.items.length, "item")].filter(Boolean).join(" · ")}</Caption>
                      </View>
                      <ChevronRight size={20} color={c.muted} />
                    </Press>
                  )
                })}
              </View>
            )}

            <View style={{ gap: 8 }}>
              <Label>Places</Label>
              <Caption>Aisles with a name, such as Freezer or Tills. They're walked after the numbered aisles, in this order.</Caption>
              {(store.places ?? []).length > 0 && (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {(store.places ?? []).map((p) => (
                    <Chip key={p} label={p} icon={<X size={16} color={c.ink} />} accessibilityLabel={`Remove the place ${p}`} onPress={() => {
                      const n = Object.values(state.items).filter((i) => typeof i.aisleAt?.[store.id] === "string" && (i.aisleAt[store.id] as string).toLowerCase() === p.toLowerCase()).length
                      change((s) => removePlace(s, store.id, p), { title: `${store.name}: removed the place ${p}` })
                      say(n ? `Removed ${p}. ${plural(n, "item")} went back to No aisle.` : `Removed ${p}.`)
                    }} />
                  ))}
                </View>
              )}
              <Field label="Add a place" value={place} onChangeText={setPlace} placeholder="e.g. Freezer" />
              <Button
                kind="secondary"
                label="Add"
                disabled={!place.trim()}
                onPress={() => {
                  const next = addPlace(state, store.id, place)
                  if (next === state) {
                    say(`${store.name} already has ${place.trim()}.`)
                    return
                  }
                  change(() => next, { title: `${store.name}: added the place ${place.trim()}` })
                  setPlace("")
                }}
              />
            </View>
          </>
        )}

        {state.stores.length <= 1 ? (
          <Caption>You need at least one store, so this one can't be removed.</Caption>
        ) : asking ? (
          <InfoBox>
            <Body>Remove {store.name}? Items lose their aisle there. Your items and list stay as they are.</Body>
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

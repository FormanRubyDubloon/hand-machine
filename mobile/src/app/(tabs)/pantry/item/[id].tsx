// A pantry item: its stock said plainly, the quick actions (about three taps to record one used), then its
// use-by date, minimum, location, aisle and notes, and the recipes it's in.
import DateTimePicker from "@react-native-community/datetimepicker"
import { router, useLocalSearchParams } from "expo-router"
import * as React from "react"
import { Platform, ScrollView, Text, View } from "react-native"
import { isBulk, isStaple, locationLabel, recipesUsing, type Location } from "../../../../../../prototypes/pantry-app/src/model"
import { useStore } from "../../../../data/store"
import { addOne, addToList, approve, openOne, setCategory, setLocation, setMin, setNotes, setUseBy, usedAll, usedOne } from "../../../../logic/actions"
import { aislesOf } from "../../../../logic/list"
import { phrase, stockStatus, expiryText } from "../../../../logic/phrases"
import { AislePicker, BackLink, Body, Button, Caption, Chip, Display, Field, InfoBox, Label, Press, Stepper } from "../../../../ui/kit"
import { LOCATIONS } from "../../../../ui/locations"
import { font, space, useColours } from "../../../../ui/theme"

export default function PantryItem() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { state, change, say } = useStore()
  const c = useColours()
  const item = state.items[id]
  const [notes, setNotesText] = React.useState(item?.notes ?? "")
  if (!item) {
    return (
      <View style={{ flex: 1, padding: space.screen, gap: 12 }}>
        <BackLink label="Back" onPress={() => router.back()} />
        <Caption>This item isn't in your pantry any more.</Caption>
      </View>
    )
  }
  const name = item.name.toLowerCase()
  const cat = state.categories.find((k) => k.id === item.categoryId)
  const store = state.stores.find((s) => s.id === state.storeId) ?? state.stores[0]
  const options = aislesOf(store, state.categories).flatMap((a) => a.categories.filter((k) => k.id).map((k) => ({ id: k.id, num: a.number ? `Aisle ${a.number}` : "–", name: k.name })))
  const bulk = isBulk(item)
  const unit = item.unit?.[0] ?? (bulk ? "pack" : "")
  const open = item.open ?? 0
  const date = (item.useBy ?? []).find((d): d is string => !!d) ?? null
  const used = recipesUsing(state.recipes, item.id)
  const note = (title: string, key?: string) => ({ title, key })

  const actions = bulk
    ? [
        { label: "Finished one", primary: true, disabled: item.inStock <= 0, run: () => { change((s) => usedOne(s, id), note(`Finished a ${unit} of ${name}`)); say(`Finished a ${unit} of ${name}.`) } },
        { label: `Open a ${unit}`, disabled: open >= item.inStock, run: () => change((s) => openOne(s, id), note(`Opened a ${unit} of ${name}`)) },
        { label: `Add a ${unit}`, run: () => change((s) => addOne(s, id), note(`Added a ${unit} of ${name}`)) },
        { label: "Add to the list", run: () => { change((s) => addToList(s, id), note(`Added ${name} to the shopping list`)); say(`Added ${name} to the list.`) } },
      ]
    : [
        { label: "Used one", primary: true, disabled: item.inStock <= 0, run: () => { change((s) => usedOne(s, id), note(`Used 1 ${name}`, `used:${id}`)); say(`Used one. ${phrase({ ...item, inStock: item.inStock - 1 })} left.`) } },
        { label: "Used all", disabled: item.inStock <= 0, run: () => { change((s) => usedAll(s, id), note(`Used all the ${name}`)); say(`Used all the ${name}.`) } },
        { label: "Add one", run: () => change((s) => addOne(s, id), note(`Added 1 ${name}`, `add:${id}`)) },
        { label: "Add to the list", run: () => { change((s) => addToList(s, id), note(`Added ${name} to the shopping list`)); say(`Added ${name} to the list.`) } },
      ]

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 12, paddingTop: 6 }}>
        <BackLink label="Back" onPress={() => router.back()} />
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: space.screen, paddingBottom: 40, gap: 20 }} keyboardShouldPersistTaps="handled">
        <View style={{ gap: 6 }}>
          <Label>{[locationLabel(item.location), cat?.name ?? "No aisle"].join(" · ")}</Label>
          <Display size={32}>{item.name}</Display>
        </View>

        {item.review && (
          <InfoBox>
            <Body><Text style={{ fontFamily: font.bold }}>New.</Text> Its aisle and where it lives are guesses. Change them below if they're wrong.</Body>
            <Button label="Looks right, save it" height={48} onPress={() => { change((s) => approve(s, id), note(`Checked ${name}`)); say(`Saved ${name}.`) }} />
          </InfoBox>
        )}

        <View style={{ gap: 4 }}>
          <Text accessibilityLiveRegion="polite" style={{ fontFamily: font.semibold, fontSize: 26, color: c.ink }}>{phrase(item)}</Text>
          <Caption style={{ fontSize: 15, lineHeight: 21 }}>{stockStatus(item)}</Caption>
        </View>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {actions.map((a) => (
            <Button key={a.label} kind={a.primary ? "primary" : "secondary"} height={60} label={a.label} disabled={a.disabled} onPress={a.run} style={{ flexBasis: "47%", flexGrow: 1 }} />
          ))}
        </View>

        <View style={{ gap: 6 }}>
          <Label>Use by</Label>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 48 }}>
            {Platform.OS === "web" ? (
              <Field value={date ?? ""} placeholder="YYYY-MM-DD" accessibilityLabel="Use by" onChangeText={(t) => /^\d{4}-\d{2}-\d{2}$/.test(t) && change((s) => setUseBy(s, id, t), note(`Changed the use-by date of ${name}`))} style={{ flex: 1 }} />
            ) : (
              <DateTimePicker
                value={date ? new Date(`${date}T12:00:00`) : new Date()}
                mode="date"
                display={Platform.OS === "ios" ? "compact" : "default"}
                accessibilityLabel="Use by"
                onChange={(_, d) => d && change((s) => setUseBy(s, id, d.toISOString().slice(0, 10)), note(`Changed the use-by date of ${name}`, `useby:${id}`))}
              />
            )}
            <Caption style={{ flex: 1 }}>{date ? expiryText(date) : item.noExpiry ? "Doesn't go off" : "No date"}</Caption>
          </View>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Label>Minimum to keep</Label>
            <Caption>{isStaple(item) ? "A Staple" : "Not a Staple"}</Caption>
          </View>
          <Stepper label="Minimum to keep" value={item.target} min={0} onChange={(n) => change((s) => setMin(s, id, n), note(`Set the minimum for ${name} to ${n}`, `min:${id}`))} />
        </View>

        <View style={{ gap: 8 }}>
          <Label>Location</Label>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {LOCATIONS.filter((l) => l.value !== "none").map((l) => (
              <Chip key={l.value} label={l.label} on={item.location === l.value} onPress={() => change((s) => setLocation(s, id, l.value as Location), note(`Moved ${name} to the ${l.label.toLowerCase()}`))} />
            ))}
          </View>
        </View>

        <AislePicker label="Shop aisle" value={item.categoryId} options={options} onPick={(k) => change((s) => setCategory(s, id, k), note(`Moved ${name} to ${state.categories.find((x) => x.id === k)?.name}`))} />

        <Field
          label="Notes"
          value={notes}
          onChangeText={setNotesText}
          onBlur={() => notes !== (item.notes ?? "") && change((s) => setNotes(s, id, notes), note(`Changed the notes on ${name}`))}
          placeholder="Anything worth remembering"
          multiline
          style={{ minHeight: 72 }}
        />

        {used.length > 0 && (
          <View style={{ gap: 6 }}>
            <Label>Used in</Label>
            {used.map((r) => (
              <Press key={r.id} fade onPress={() => router.push({ pathname: "/recipes/[id]", params: { id: r.id } })} style={{ minHeight: 44, justifyContent: "center" }}>
                <Text style={{ fontFamily: font.medium, fontSize: 17, color: c.ink, textDecorationLine: "underline", textDecorationColor: c.olive }}>{r.name}</Text>
              </Press>
            ))}
          </View>
        )}
        <Caption>Changes here go to your pantry by themselves.</Caption>
      </ScrollView>
    </View>
  )
}

// Add to the list (sheet). Type to find something in the pantry and tap it, then choose how many and whether
// you've already got it (Batch 1, 24 Nov 2026). Something the pantry doesn't have becomes a New pantry item, bought
// or not; added from an aisle it's in that aisle here, and from a tag it has that tag (the aisle chips went in
// Batch 4). "Already got it" ticks it off straight away, so it's in stock.
import { router, useLocalSearchParams } from "expo-router"
import { Check, Plus } from "lucide-react-native"
import * as React from "react"
import { ScrollView, Text, View } from "react-native"
import { containsText, locationLabel, matchesName, namesOf, needOf } from "../../../prototypes/pantry-app/src/model"
import { useStore } from "../data/store"
import { addNew, addToList, gotNow } from "../logic/actions"
import { count, phrase } from "../logic/phrases"
import { Body, Button, Caption, Chip, Field, Label, Press, Stepper, type FieldRef } from "../ui/kit"
import { SheetHeader } from "../ui/sheet"
import { font, useColours } from "../ui/theme"

export default function Add() {
  const { state, change, say } = useStore()
  const c = useColours()
  const [q, setQ] = React.useState("")
  // Opened from an aisle or a tag on the list: a new item goes in that aisle (in this store) or gets that tag.
  const { category, aisle } = useLocalSearchParams<{ category?: string; aisle?: string }>()
  const inAisle = aisle ? (/^\d+$/.test(aisle) ? Number(aisle) : aisle) : null
  const where = inAisle !== null ? (typeof inAisle === "number" ? `aisle ${inAisle}` : inAisle) : category ? state.categories.find((k) => k.id === category)?.name : undefined
  const input = React.useRef<FieldRef>(null)
  const query = q.trim()
  const pantry = Object.values(state.items).filter((i) => !i.oneOff)
  const matches = query ? pantry.filter((i) => namesOf(i).some((n) => containsText(n, query))).sort((a, b) => a.name.localeCompare(b.name)).slice(0, 8) : []
  const exact = query && pantry.some((i) => matchesName(i, query))
  // The pantry item tapped, waiting for how many and Add. Typing again lets it go.
  const [picked, setPicked] = React.useState<string | null>(null)
  const [qty, setQty] = React.useState(1)
  const [got, setGot] = React.useState(false)
  const reset = () => {
    setPicked(null)
    setQty(1)
    setGot(false)
  }
  const type = (text: string) => {
    // iOS can report the same text again (when the keyboard commits it), which mustn't let go of the choice.
    if (text === q) return
    setQ(text)
    if (picked) reset()
  }

  const addPicked = (id: string) => {
    const i = state.items[id]
    if (!i) return
    const name = i.name.toLowerCase()
    change((s) => (got ? gotNow(addToList(s, id, qty), id, qty) : addToList(s, id, qty)), got
      ? { title: `Got ${qty} ${name} on the phone`, detail: "Added to the list and ticked off" }
      : { title: `Added ${qty} ${name} to the shopping list`, detail: "Added on the phone" })
    router.back()
    say(got ? `Added and ticked off: ${name}.` : `Added ${qty > 1 ? `${qty} ` : ""}${name} to the list.`)
  }

  const addNewOne = (more: boolean) => {
    const name = query
    change((s) => {
      const made = addNew(s, name, category ?? "", qty, inAisle)
      return got ? gotNow(made.state, made.id, qty) : made.state
    }, got ? { title: `Got ${qty} ${name} on the phone`, detail: "New · added to the pantry" } : { title: `Added ${name} to the shopping list`, detail: "New · not in the pantry yet" })
    setQ("")
    reset()
    if (more) {
      say(`Added ${name}. Type the next one.`)
      input.current?.focus()
    } else {
      router.back()
      say(got ? `Added to your pantry and ticked off: ${name}.` : `Added ${name} to the list. It joins your pantry once you buy it.`)
    }
  }

  // How many, and Already got it: the same two for a pantry item and a new one.
  const amount = (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Label>How many</Label>
        <Stepper label="How many to add" value={qty} min={1} onChange={setQty} />
      </View>
      <View style={{ flexDirection: "row" }}>
        <Chip label="Already got it" on={got} onPress={() => setGot(!got)} icon={got ? <Check size={16} color={c.onOlive} /> : undefined} accessibilityLabel="Already got it. Ticks it off as soon as it's added" />
      </View>
    </View>
  )

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <SheetHeader title="Add to the list" />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }} keyboardShouldPersistTaps="handled">
        <Field ref={input} autoFocus value={q} onChangeText={type} placeholder="What do you need?" accessibilityLabel="What do you need?" returnKeyType="done" autoCorrect={false} />
        {matches.map((i) => {
          const on = needOf(i)
          const sub = [i.inStock > 0 ? `${phrase(i)} left` : "None left", i.location ? locationLabel(i.location) : "", on ? `${on} on the list` : ""].filter(Boolean).join(" · ")
          const on2 = picked === i.id
          if (picked && !on2) return null
          return (
            <View key={i.id} style={{ gap: 16, borderBottomWidth: 1, borderBottomColor: c.line, paddingBottom: on2 ? 16 : 0 }}>
              <Press
                accessibilityLabel={on2 ? `${i.name}, chosen. ${sub}` : `Add ${i.name}. ${sub}`}
                accessibilityState={{ selected: on2 }}
                onPress={() => (on2 ? reset() : setPicked(i.id))}
                style={{ minHeight: 64, flexDirection: "row", alignItems: "center", gap: 12 }}
              >
                <View style={{ flex: 1, paddingVertical: 8 }}>
                  <Text style={{ fontFamily: font.medium, fontSize: 18, color: c.ink }}>{i.name}</Text>
                  <Caption>{sub}</Caption>
                </View>
                {on2 ? <Check size={22} color={c.olive} /> : <Plus size={22} color={c.ink} />}
              </Press>
              {on2 && (
                <>
                  {amount}
                  <Button label={got ? `Add and tick off ${count(i, qty)}` : `Add ${count(i, qty)}`} onPress={() => addPicked(i.id)} />
                </>
              )}
            </View>
          )
        })}
        {!!query && !exact && !picked && (
          <View style={{ gap: 12, marginTop: 8 }}>
            <Body>“{query}” isn't in your pantry yet. It's added as new{where ? `, in ${where}` : ""}.</Body>
            {amount}
            <Button label={`Add “${query}”`} onPress={() => addNewOne(false)} />
            <Press fade onPress={() => addNewOne(true)} style={{ minHeight: 44, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontFamily: font.medium, fontSize: 16, color: c.ink, textDecorationLine: "underline" }}>Add, then add another</Text>
            </Press>
          </View>
        )}
        {!query && <Caption>Type to find something in your pantry, or add something new.</Caption>}
      </ScrollView>
    </View>
  )
}

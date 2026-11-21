// Add to the list (sheet). Type to find something in the pantry and tap it to put one on the list. Something
// the pantry doesn't have can be added with an aisle; it becomes a New pantry item, bought or not.
import { router, useLocalSearchParams } from "expo-router"
import { Plus } from "lucide-react-native"
import * as React from "react"
import { ScrollView, Text, View } from "react-native"
import { containsText, locationLabel, matchesName, namesOf, needOf } from "../../../prototypes/pantry-app/src/model"
import { useStore } from "../data/store"
import { addNew, addToList } from "../logic/actions"
import { aislesOf } from "../logic/list"
import { phrase } from "../logic/phrases"
import { Body, Button, Caption, Chip, Field, Press, type FieldRef } from "../ui/kit"
import { SheetHeader } from "../ui/sheet"
import { font, useColours } from "../ui/theme"

export default function Add() {
  const { state, change, say } = useStore()
  const c = useColours()
  const [q, setQ] = React.useState("")
  // Opened from an aisle with one category: a new item goes there unless another is picked.
  const { category } = useLocalSearchParams<{ category?: string }>()
  const [cat, setCat] = React.useState(category ?? "")
  const input = React.useRef<FieldRef>(null)
  const query = q.trim()
  const pantry = Object.values(state.items).filter((i) => !i.oneOff)
  const matches = query ? pantry.filter((i) => namesOf(i).some((n) => containsText(n, query))).sort((a, b) => a.name.localeCompare(b.name)).slice(0, 8) : []
  const exact = query && pantry.some((i) => matchesName(i, query))
  const store = state.stores.find((s) => s.id === state.storeId) ?? state.stores[0]
  const cats = aislesOf(store, state.categories).flatMap((a) => a.categories.filter((k) => k.id))

  const addNewOne = (more: boolean) => {
    const name = query
    change((s) => addNew(s, name, cat).state, { title: `Added ${name} to the shopping list`, detail: "New · not in the pantry yet" })
    setQ("")
    setCat(category ?? "")
    if (more) {
      say(`Added ${name}. Type the next one.`)
      input.current?.focus()
    } else {
      router.back()
      say(`Added ${name} to the list. It joins your pantry once you buy it.`)
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <SheetHeader title="Add to the list" />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }} keyboardShouldPersistTaps="handled">
        <Field ref={input} autoFocus value={q} onChangeText={setQ} placeholder="What do you need?" accessibilityLabel="What do you need?" returnKeyType="done" autoCorrect={false} />
        {matches.map((i) => {
          const on = needOf(i)
          const sub = [i.inStock > 0 ? `${phrase(i)} left` : "None left", i.location ? locationLabel(i.location) : "", on ? `${on} on the list` : ""].filter(Boolean).join(" · ")
          return (
            <Press
              key={i.id}
              accessibilityLabel={`Add ${i.name}. ${sub}`}
              onPress={() => {
                change((s) => addToList(s, i.id), { title: `Added 1 ${i.name.toLowerCase()} to the shopping list`, detail: "Added on the phone" })
                router.back()
                say(`Added ${i.name.toLowerCase()} to the list.`)
              }}
              style={{ minHeight: 64, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1, borderBottomColor: c.line }}
            >
              <View style={{ flex: 1, paddingVertical: 8 }}>
                <Text style={{ fontFamily: font.medium, fontSize: 18, color: c.ink }}>{i.name}</Text>
                <Caption>{sub}</Caption>
              </View>
              <Plus size={22} color={c.ink} />
            </Press>
          )
        })}
        {!!query && !exact && (
          <View style={{ gap: 12, marginTop: 8 }}>
            <Body>“{query}” isn't in your pantry yet. Which aisle?</Body>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {cats.map((k) => <Chip key={k.id} label={k.name} on={cat === k.id} onPress={() => setCat(cat === k.id ? "" : k.id)} />)}
            </View>
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

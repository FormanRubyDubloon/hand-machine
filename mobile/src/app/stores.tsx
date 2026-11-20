// Which store? (sheet). Choosing one reorders the list by its aisle numbers and goes back to the first aisle.
import { router } from "expo-router"
import { Check } from "lucide-react-native"
import * as React from "react"
import { ScrollView, Text, View } from "react-native"
import { useStore } from "../data/store"
import { addStore, chooseStore } from "../logic/actions"
import { Button, Caption, Field, Press } from "../ui/kit"
import { SheetHeader } from "../ui/sheet"
import { font, useColours } from "../ui/theme"

export default function Stores() {
  const { state, change, local, say } = useStore()
  const c = useColours()
  const [name, setName] = React.useState("")
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <SheetHeader title="Which store?" />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }} keyboardShouldPersistTaps="handled">
        <View>
          {state.stores.map((s) => {
            const on = s.id === state.storeId
            return (
              <Press key={s.id} accessibilityState={{ selected: on }} onPress={() => { local((x) => chooseStore(x, s.id)); router.back() }} style={{ minHeight: 60, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1, borderBottomColor: c.line }}>
                <Text style={{ flex: 1, fontFamily: on ? font.bold : font.medium, fontSize: 18, color: c.ink }}>{s.name}</Text>
                {on && <Check size={22} color={c.ink} />}
              </Press>
            )
          })}
        </View>
        <Button kind="secondary" label="Edit aisle numbers here" onPress={() => { router.back(); router.push({ pathname: "/settings/store/[id]", params: { id: state.storeId } }) }} />
        <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
          <Field style={{ flex: 1 }} value={name} onChangeText={setName} placeholder="Add a store" accessibilityLabel="New store name" />
          <Button
            label="Add"
            height={48}
            disabled={!name.trim()}
            onPress={() => {
              const made = addStore(state, name)
              if (!made) return
              change(() => ({ ...made.state, storeId: made.id, aisle: 0 }))
              setName("")
              say(`Added ${name.trim()}. Set its aisle numbers in Settings.`)
            }}
          />
        </View>
        <Caption>Store changes go to your pantry by themselves.</Caption>
      </ScrollView>
    </View>
  )
}

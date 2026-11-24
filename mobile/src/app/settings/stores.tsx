// Settings › Stores: the stores you shop in ("Using" marks the current one), and Add a store.
import { router } from "expo-router"
import { ChevronRight } from "lucide-react-native"
import * as React from "react"
import { ScrollView, Text, View } from "react-native"
import { useStore } from "../../data/store"
import { addStore } from "../../logic/actions"
import { plural } from "../../logic/phrases"
import { Button, Caption, Field, Pill, Press } from "../../ui/kit"
import { useLeaveSettings } from "../../ui/leave-settings"
import { SheetHeader } from "../../ui/sheet"
import { font, useColours } from "../../ui/theme"

export default function Stores() {
  const { state, change, say } = useStore()
  const c = useColours()
  const [name, setName] = React.useState("")
  const leave = useLeaveSettings()
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <SheetHeader back={{ label: "Settings", onPress: () => router.back() }} full onDone={() => leave(name.trim())} />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} keyboardShouldPersistTaps="handled">
        <Caption style={{ fontSize: 15 }}>The store you shop in sets the aisle order on your list.</Caption>
        <View style={{ borderTopWidth: 1, borderTopColor: c.line }}>
          {state.stores.map((s) => {
            const numbered = new Set(Object.values(s.aisles).filter((n) => n != null && n > 0)).size
            return (
              <Press key={s.id} onPress={() => router.push({ pathname: "/settings/store/[id]", params: { id: s.id } })} style={{ minHeight: 68, flexDirection: "row", alignItems: "center", gap: 10, borderBottomWidth: 1, borderBottomColor: c.line, paddingVertical: 8 }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontFamily: font.medium, fontSize: 18, color: c.ink }}>{s.name}</Text>
                  <Caption>{numbered ? plural(numbered, "aisle number") : "No aisle numbers yet"}</Caption>
                </View>
                {s.id === state.storeId && <Pill label="Using" />}
                <ChevronRight size={22} color={c.muted} />
              </Press>
            )
          })}
        </View>
        <Field label="Add a store" value={name} onChangeText={setName} placeholder="e.g. Fishmonger on Church Street" />
        <Button
          label="Add"
          disabled={!name.trim()}
          onPress={() => {
            const made = addStore(state, name)
            if (!made) return
            change(() => made.state)
            setName("")
            say(`Added ${name.trim()}.`)
            router.push({ pathname: "/settings/store/[id]", params: { id: made.id } })
          }}
        />
        <Caption>Store changes go to your pantry by themselves.</Caption>
      </ScrollView>
    </View>
  )
}

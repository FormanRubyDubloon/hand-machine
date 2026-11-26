// Skipped this shop (sheet, from the text button under the list; Isaac's change, 24 Nov 2026): what you've
// skipped here, each with Bring back, and Bring all back at the foot. Skips are only on this phone.
import { router } from "expo-router"
import * as React from "react"
import { ScrollView, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useStore } from "../data/store"
import { skip, unskipAll } from "../logic/actions"
import { rowsOf } from "../logic/list"
import { count } from "../logic/phrases"
import { Button, Caption, Press } from "../ui/kit"
import { SheetHeader } from "../ui/sheet"
import { font, useColours } from "../ui/theme"

export default function Skipped() {
  const { state, local } = useStore()
  const c = useColours()
  const insets = useSafeAreaInsets()
  const rows = rowsOf(state).filter((r) => r.skipped).sort((a, b) => a.item.name.localeCompare(b.item.name))
  const store = state.stores.find((s) => s.id === state.storeId)

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      {/* A little more room above the title than other sheets, since there's no Done beside it (as Filters). */}
      <View style={{ paddingTop: 10 }}>
        <SheetHeader title="Skipped this shop" noDone />
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20, gap: 12 }}>
        <Caption style={{ fontSize: 15 }}>
          {rows.length
            ? `Still to buy, just not ${store ? `at ${store.name}` : "this time"}. They come back when you change store or start a new list.`
            : "Nothing skipped."}
        </Caption>
        <View style={{ borderTopWidth: rows.length ? 1 : 0, borderTopColor: c.line }}>
          {rows.map((r) => (
            <View key={r.id} style={{ minHeight: 68, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1, borderBottomColor: c.line, paddingVertical: 8 }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontFamily: font.medium, fontSize: 18, color: c.ink }}>{r.item.name}</Text>
                <Caption>{[`${count(r.item, r.left)} to get`, r.note].filter(Boolean).join(" · ")}</Caption>
              </View>
              <Press
                fade
                onPress={() => {
                  local((s) => skip(s, r.id, false))
                  // Bringing back the last one leaves nothing here, so the sheet closes.
                  if (rows.length === 1) router.back()
                }} accessibilityLabel={`Bring back ${r.item.name}`} style={{ minHeight: 44, justifyContent: "center" }}>
                <Text style={{ fontFamily: font.semibold, fontSize: 15, color: c.primary }}>Bring back</Text>
              </Press>
            </View>
          ))}
        </View>
      </ScrollView>
      <View style={{ flexDirection: "row", gap: 12, paddingHorizontal: 20, paddingTop: 12, paddingBottom: insets.bottom + 12, borderTopWidth: 1, borderTopColor: c.line }}>
        <Button
          kind="secondary"
          label="Bring all back"
          disabled={!rows.length}
          onPress={() => {
            local((s) => ({ ...s, shop: s.shop ? unskipAll(s.shop) : s.shop }))
            router.back()
          }}
          style={{ flex: 1 }}
        />
        <Button label="Done" onPress={() => router.back()} style={{ flex: 1 }} />
      </View>
    </View>
  )
}

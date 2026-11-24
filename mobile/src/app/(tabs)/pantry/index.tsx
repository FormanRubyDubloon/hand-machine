// PANTRY: search, then New items to review (only when there are some), the In stock only switch, See all, and a
// card per location with what's in it and what needs using soon. Locations with nothing to show are left out
// (Batch 2, 24 Nov 2026), so with In stock only on, a location whose things have all run out disappears.
import { router } from "expo-router"
import { ChevronRight, Search } from "lucide-react-native"
import * as React from "react"
import { RefreshControl, ScrollView, Text, View } from "react-native"
import { useStore } from "../../../data/store"
import { inStockOnly, locationCounts, pantryItems } from "../../../logic/pantry"
import { plural, goingOffSoon } from "../../../logic/phrases"
import { Caption, Field, Label, Press, Toggle } from "../../../ui/kit"
import { LOCATIONS } from "../../../ui/locations"
import { font, radius, space, useColours } from "../../../ui/theme"

export default function Pantry() {
  const { state, local, pulling, pullToSync } = useStore()
  const c = useColours()
  const [q, setQ] = React.useState("")
  const everything = pantryItems(state.items, true)
  const review = everything.filter((i) => i.review)
  const only = inStockOnly(state)
  const items = pantryItems(state.items, !only)
  const counts = locationCounts(items)
  const tiles = LOCATIONS.map((l) => {
    const mine = items.filter((i) => (i.location ?? "none") === l.value)
    return { ...l, count: counts.get(l.value) ?? 0, soon: mine.filter(goingOffSoon).length }
  }).filter((t) => t.count > 0)

  return (
    <ScrollView
      contentContainerStyle={{ padding: space.screen, gap: 10, paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={pulling} onRefresh={() => void pullToSync()} tintColor={c.muted} />}
    >
      <View style={{ marginBottom: 6 }}>
        <Field
          value={q}
          onChangeText={setQ}
          placeholder="Search the pantry"
          accessibilityLabel="Search the pantry"
          returnKeyType="search"
          onSubmitEditing={() => q.trim() && router.push({ pathname: "/pantry/browse", params: { q: q.trim() } })}
          style={{ paddingLeft: 42 }}
        />
        <Search size={18} color={c.muted} style={{ position: "absolute", left: 14, top: 15 }} pointerEvents="none" />
      </View>
      {!!q.trim() && (
        <Press onPress={() => router.push({ pathname: "/pantry/browse", params: { q: q.trim() } })} style={{ minHeight: 48, justifyContent: "center" }}>
          <Text style={{ fontFamily: font.medium, fontSize: 16, color: c.ink, textDecorationLine: "underline" }}>Show what matches “{q.trim()}”</Text>
        </Press>
      )}
      {review.length > 0 && (
        <Press onPress={() => router.push({ pathname: "/pantry/browse", params: { review: "1" } })} style={{ minHeight: 64, borderRadius: radius.base, backgroundColor: c.olive, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ flex: 1, paddingVertical: 10 }}>
            <Text style={{ fontFamily: font.semibold, fontSize: 17, color: c.onOlive }}>{plural(review.length, "new item")} to review</Text>
            <Text style={{ fontFamily: font.regular, fontSize: 14, color: c.onOlive }}>Check their aisle and where they live.</Text>
          </View>
          <ChevronRight size={22} color={c.onOlive} />
        </Press>
      )}
      {everything.length > 0 && (
        <>
          <Toggle
            label="In stock only"
            caption={only ? `${plural(everything.length - items.length, "item")} out of stock hidden` : "Showing everything, out of stock too"}
            value={only}
            onChange={(on) => local((s) => ({ ...s, pantryAll: !on }))}
          />
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
            <Label>Where it lives</Label>
            <Press fade onPress={() => router.push({ pathname: "/pantry/browse", params: { all: "1" } })} accessibilityLabel={`See all ${plural(items.length, "item")}`} style={{ minHeight: 44, flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Text style={{ fontFamily: font.semibold, fontSize: 15, color: c.olive }}>See all ({items.length})</Text>
              <ChevronRight size={18} color={c.olive} />
            </Press>
          </View>
        </>
      )}
      {tiles.map((t) => {
        const Icon = t.icon
        return (
          <Press key={t.value} onPress={() => router.push({ pathname: "/pantry/browse", params: { loc: t.value } })} accessibilityLabel={`${t.label}, ${plural(t.count, "item")}${t.soon ? `, ${t.soon} to use soon` : ""}`} style={{ minHeight: 92, borderWidth: 1, borderColor: c.olive, borderRadius: radius.base, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 14 }}>
            <View style={{ width: 48, height: 48, borderRadius: radius.base, backgroundColor: c.panel, alignItems: "center", justifyContent: "center" }}>
              <Icon size={26} color={c.ink} strokeWidth={1.75} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontFamily: font.serif, fontWeight: "700", fontSize: 26, letterSpacing: 1, textTransform: "uppercase", color: c.ink }}>{t.label}</Text>
              {t.soon > 0 && <Caption>{t.soon} to use soon</Caption>}
            </View>
            <Text style={{ fontFamily: font.regular, fontSize: 20, color: c.muted }}>{t.count}</Text>
          </Press>
        )
      })}
      {everything.length === 0 && <Caption>Your pantry is empty. Add things in Collca on the web, or tell Claude what you have.</Caption>}
      {everything.length > 0 && items.length === 0 && <Caption>Nothing's in stock. Turn off In stock only to see everything.</Caption>}
    </ScrollView>
  )
}

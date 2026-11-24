// PANTRY: New items to review (only when there are some), All items (a card like the
// locations, first; Isaac's change, 24 Nov 2026, in place of the See all link), and a
// card per location with what's in it and what needs using soon. Locations with nothing to show are left out
// (Batch 2, 24 Nov 2026), so with In stock only on, a location whose things have all run out disappears. The In stock
// only switch went from this page (Isaac's change, 24 Nov 2026): it's in All items' Filters and on each location's page,
// and this page follows it. Its search
// field went in Batch 5: search is the header's, across the list, the pantry and recipes.
import { router } from "expo-router"
import { ChevronRight, LayoutList, type LucideIcon } from "lucide-react-native"
import * as React from "react"
import { RefreshControl, ScrollView, Text, View } from "react-native"
import { useStore } from "../../../data/store"
import { inStockOnly, locationCounts, pantryItems } from "../../../logic/pantry"
import { plural, goingOffSoon } from "../../../logic/phrases"
import { Caption, Label, Press } from "../../../ui/kit"
import { LOCATIONS } from "../../../ui/locations"
import { font, radius, space, useColours } from "../../../ui/theme"

export default function Pantry() {
  const { state, pulling, pullToSync } = useStore()
  const c = useColours()
  const everything = pantryItems(state.items, true)
  const review = everything.filter((i) => i.review)
  const only = inStockOnly(state)
  const items = pantryItems(state.items, !only)
  const counts = locationCounts(items)
  const tiles = LOCATIONS.map((l) => {
    const mine = items.filter((i) => (i.location ?? "none") === l.value)
    return { ...l, count: counts.get(l.value) ?? 0, soon: mine.filter(goingOffSoon).length }
  }).filter((t) => t.count > 0)
  const soonAll = items.filter(goingOffSoon).length

  return (
    <ScrollView
      contentContainerStyle={{ padding: space.screen, gap: 10, paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={pulling} onRefresh={() => void pullToSync()} tintColor={c.muted} />}
    >
      {review.length > 0 && (
        <Press onPress={() => router.push({ pathname: "/pantry/browse", params: { review: "1" } })} style={{ minHeight: 64, borderRadius: radius.base, backgroundColor: c.olive, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ flex: 1, paddingVertical: 10 }}>
            <Text style={{ fontFamily: font.semibold, fontSize: 17, color: c.onOlive }}>{plural(review.length, "new item")} to review</Text>
            <Text style={{ fontFamily: font.regular, fontSize: 14, color: c.onOlive }}>Check where they live and their tags.</Text>
          </View>
          <ChevronRight size={22} color={c.onOlive} />
        </Press>
      )}
      {everything.length > 0 && (
        <>
          <View style={{ marginTop: 4, minHeight: 32, justifyContent: "center" }}>
            <Label>Where it lives</Label>
          </View>
          {everything.length > 0 && (
            <Card
              icon={LayoutList}
              label="All items"
              count={items.length}
              sub={soonAll ? `${soonAll} to use soon` : undefined}
              a11y={`All items, ${plural(items.length, "item")}${soonAll ? `, ${soonAll} to use soon` : ""}`}
              onPress={() => router.push({ pathname: "/pantry/browse", params: { all: "1" } })}
            />
          )}
        </>
      )}
      {tiles.map((t) => {
        return (
          <Card
            key={t.value}
            icon={t.icon}
            label={t.label}
            count={t.count}
            sub={t.soon ? `${t.soon} to use soon` : undefined}
            a11y={`${t.label}, ${plural(t.count, "item")}${t.soon ? `, ${t.soon} to use soon` : ""}`}
            onPress={() => router.push({ pathname: "/pantry/browse", params: { loc: t.value } })}
          />
        )
      })}
      {everything.length === 0 && <Caption>Your pantry is empty. Add things in Collca on the web, or tell Claude what you have.</Caption>}
      {everything.length > 0 && items.length === 0 && <Caption>Nothing's in stock. To see everything, open All items' Filters and choose Everything.</Caption>}
    </ScrollView>
  )
}

/** A card on the pantry's landing page: All items, or a location. */
function Card({ icon: Icon, label, count, sub, a11y, onPress }: { icon: LucideIcon; label: string; count: number; sub?: string; a11y: string; onPress: () => void }) {
  const c = useColours()
  return (
    <Press onPress={onPress} accessibilityLabel={a11y} style={{ minHeight: 92, borderWidth: 1, borderColor: c.olive, borderRadius: radius.base, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 14 }}>
      <View style={{ width: 48, height: 48, borderRadius: radius.base, backgroundColor: c.panel, alignItems: "center", justifyContent: "center" }}>
        <Icon size={26} color={c.ink} strokeWidth={1.75} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontFamily: font.serif, fontWeight: "700", fontSize: 26, letterSpacing: 1, textTransform: "uppercase", color: c.ink }}>{label}</Text>
        {!!sub && <Caption>{sub}</Caption>}
      </View>
      <Text style={{ fontFamily: font.regular, fontSize: 20, color: c.muted }}>{count}</Text>
    </Press>
  )
}

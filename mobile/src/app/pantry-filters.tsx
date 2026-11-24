// All items' filters (sheet; Isaac's change, 24 Nov 2026), in the shopping list's Filters style: Sort, Where (one
// location), Show (Staples, Use soon, Low, Out) and Stock (In stock only, or everything). Each choice applies at once;
// they're kept on this phone. Clear filters puts back A to Z, everywhere, everything shown, in stock only.
import { router } from "expo-router"
import * as React from "react"
import { ScrollView, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useStore } from "../data/store"
import { defaultView, inStockOnly, locationCounts, pantryFiltersOn, pantryItems, SHOWS, SORTS, viewOf, type PantryView } from "../logic/pantry"
import { Button, Caption, Chip, Label, Segmented } from "../ui/kit"
import { LOCATIONS } from "../ui/locations"
import { SheetHeader } from "../ui/sheet"
import { useColours } from "../ui/theme"

export default function PantryFilters() {
  const { state, local } = useStore()
  const c = useColours()
  const insets = useSafeAreaInsets()
  const v = state.pantryView ?? defaultView
  const only = inStockOnly(state)
  const set = (next: Partial<PantryView>) => local((s) => ({ ...s, pantryView: { ...(s.pantryView ?? defaultView), ...next } }))
  const setOnly = (on: boolean) => local((s) => ({ ...s, pantryAll: on ? undefined : true }))
  const everything = pantryItems(state.items, true)
  const pool = pantryItems(state.items, !only)
  const counts = locationCounts(pool)
  const shown = viewOf(v.show === "out" ? everything : pool, v).length
  const n = (p: Partial<PantryView>) => viewOf(p.show === "out" ? everything : pool, { ...defaultView, ...p }).length
  const on = pantryFiltersOn(v, !only)

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ paddingTop: 10 }}>
        <SheetHeader title="Filters" noDone />
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 24 }}>
        <View style={{ gap: 10 }}>
          <Label>Sort</Label>
          <Segmented label="Sort" value={v.sort} onChange={(sort) => set({ sort })} options={SORTS} />
        </View>
        <View style={{ gap: 10 }}>
          <Label>Where</Label>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <Chip label="All" on={v.location === null} onPress={() => set({ location: null })} />
            {LOCATIONS.filter((l) => counts.get(l.value)).map((l) => (
              <Chip key={l.value} label={`${l.label} · ${counts.get(l.value)}`} on={v.location === l.value} onPress={() => set({ location: v.location === l.value ? null : l.value })} />
            ))}
          </View>
        </View>
        <View style={{ gap: 10 }}>
          <Label>Show</Label>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <Chip label="All" on={v.show === null} onPress={() => set({ show: null })} />
            {SHOWS.map((x) => (
              <Chip
                key={x.value}
                label={`${x.label} · ${n({ show: x.value })}`}
                on={v.show === x.value}
                onPress={() => {
                  const turnOn = v.show !== x.value
                  set({ show: turnOn ? x.value : null })
                  // Out of stock can't show with In stock only, so asking for it shows everything.
                  if (turnOn && x.value === "out" && only) setOnly(false)
                }}
              />
            ))}
          </View>
        </View>
        <View style={{ gap: 10 }}>
          <Label>Stock</Label>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <Chip label="In stock only" on={only} onPress={() => setOnly(true)} />
            <Chip label={`Everything · ${everything.length}`} on={!only} onPress={() => setOnly(false)} />
          </View>
        </View>
        <Caption>{on ? `Showing ${shown} of ${everything.length} items.` : `Showing everything in stock (${shown}).`}</Caption>
      </ScrollView>
      <View style={{ flexDirection: "row", gap: 12, paddingHorizontal: 20, paddingTop: 12, paddingBottom: insets.bottom + 12, borderTopWidth: 1, borderTopColor: c.line }}>
        <Button
          kind="secondary"
          label="Clear filters"
          disabled={!on && v.sort === defaultView.sort}
          onPress={() => local((s) => ({ ...s, pantryView: undefined, pantryAll: undefined }))}
          style={{ flex: 1 }}
        />
        <Button label="Done" onPress={() => router.back()} style={{ flex: 1 }} />
      </View>
    </View>
  )
}

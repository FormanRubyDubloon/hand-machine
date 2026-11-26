// List filters (sheet). Show: why it's on the list (Staples, For recipes, Added). Stock: Low or Out. Show ordered
// items: a switch, on by default (26 Nov 2026; Ordered used to be a Stock choice). Store: only items set to the
// store you're in (Batch 3; items for any store are hidden too since 26 Nov 2026). Each choice applies at once; the
// counts are of everything on the list. The filters stay on through a shop and clear when a new list starts.
import { router } from "expo-router"
import * as React from "react"
import { ScrollView, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useStore } from "../data/store"
import { filtersOn, matchesFilter, NO_FILTER, rowsOf, type ListFilter } from "../logic/list"
import { Button, Caption, Chip, Label, Toggle } from "../ui/kit"
import { SheetHeader } from "../ui/sheet"
import { useColours } from "../ui/theme"

const SHOW: { value: ListFilter["show"]; label: string }[] = [
  { value: "all", label: "All" },
  { value: "staples", label: "Staples" },
  { value: "recipes", label: "For recipes" },
  { value: "added", label: "Added" },
]
const STOCK: { value: ListFilter["stock"]; label: string }[] = [
  { value: "all", label: "All" },
  { value: "low", label: "Low" },
  { value: "out", label: "Out" },
]

export default function Filters() {
  const { state, local } = useStore()
  const c = useColours()
  const insets = useSafeAreaInsets()
  const f = state.filter ?? NO_FILTER
  const rows = rowsOf(state)
  const store = state.stores.find((x) => x.id === state.storeId)
  const shown = rows.filter((r) => matchesFilter(r, f, state.storeId)).length
  // Changing a filter goes back to the first aisle, since the aisles shown change with it.
  const set = (next: ListFilter) => local((s) => ({ ...s, filter: filtersOn(next) ? next : undefined, aisle: s.aisle === "all" ? "all" : 0 }))
  const n = (p: Partial<ListFilter>) => rows.filter((r) => matchesFilter(r, { ...NO_FILTER, ...p }, state.storeId)).length
  const ordered = rows.filter((r) => r.ordered).length

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      {/* A little more room above the title than other sheets, since there's no Done beside it. */}
      <View style={{ paddingTop: 10 }}>
        <SheetHeader title="Filters" noDone />
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 24 }}>
        <View style={{ gap: 10 }}>
          <Label>Show</Label>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {SHOW.map((o) => (
              <Chip key={o.value} label={o.value === "all" ? o.label : `${o.label} · ${n({ show: o.value })}`} on={f.show === o.value} onPress={() => set({ ...f, show: o.value })} />
            ))}
          </View>
        </View>
        <View style={{ gap: 10 }}>
          <Label>Stock</Label>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {STOCK.map((o) => (
              <Chip key={o.value} label={o.value === "all" ? o.label : `${o.label} · ${n({ stock: o.value })}`} on={f.stock === o.value || (o.value === "all" && f.stock !== "low" && f.stock !== "out")} onPress={() => set({ ...f, stock: o.value })} />
            ))}
          </View>
        </View>
        <Toggle
          leading
          label="Show ordered items"
          caption={ordered ? `${ordered} ordered online` : "Nothing on the list is ordered."}
          value={!f.hideOrdered}
          onChange={(on) => set({ ...f, hideOrdered: on ? undefined : true })}
        />
        {state.stores.length > 1 && (
          <View style={{ gap: 10 }}>
            <Label>Store</Label>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              <Chip label={`Only items for ${store?.name ?? "this store"} · ${n({ thisStore: true })}`} on={!!f.thisStore} onPress={() => set({ ...f, thisStore: !f.thisStore || undefined })} />
            </View>
            <Caption>Shows only things set to {store?.name ?? "this store"}. Items for any store are hidden.</Caption>
          </View>
        )}
        <Caption>{filtersOn(f) ? `Showing ${shown} of ${rows.length} on the list.` : `Showing everything on the list (${rows.length}).`}</Caption>
      </ScrollView>
      {/* The foot: clear everything, or close. Clear is off when no filter is on. */}
      <View style={{ flexDirection: "row", gap: 12, paddingHorizontal: 20, paddingTop: 12, paddingBottom: insets.bottom + 12, borderTopWidth: 1, borderTopColor: c.line }}>
        <Button kind="secondary" label="Clear filters" disabled={!filtersOn(f)} onPress={() => set(NO_FILTER)} style={{ flex: 1 }} />
        <Button label="Done" onPress={() => router.back()} style={{ flex: 1 }} />
      </View>
    </View>
  )
}

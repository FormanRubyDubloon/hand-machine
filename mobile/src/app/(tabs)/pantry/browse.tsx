// A list of pantry items: one location (soonest use-by first), everything (See all, with sorting and filters),
// search results, or the New items to review. One location and See all follow the In stock only switch
// (Batch 2, 24 Nov 2026); search and To review always show everything, so nothing you look for is hidden.
import { router, useLocalSearchParams } from "expo-router"
import * as React from "react"
import { FlatList, ScrollView, Text, View } from "react-native"
import { containsText, locationLabel, namesOf, soonest, type Item } from "../../../../../prototypes/pantry-app/src/model"
import { useStore } from "../../../data/store"
import { defaultView, inStockOnly, locationCounts, pantryItems, SHOWS, SORTS, viewOf, type PantryView } from "../../../logic/pantry"
import { phrase, plural, expiryText } from "../../../logic/phrases"
import { BackLink, Caption, Chip, Display, Label, Pill, Press, Segmented, Toggle } from "../../../ui/kit"
import { LOCATIONS } from "../../../ui/locations"
import { font, space, useColours } from "../../../ui/theme"

const bySoonest = (a: Item, b: Item) => (soonest(a) ?? "9999").localeCompare(soonest(b) ?? "9999") || a.name.localeCompare(b.name)

export default function Browse() {
  const { loc, q, review, all: seeAll } = useLocalSearchParams<{ loc?: string; q?: string; review?: string; all?: string }>()
  const { state, local } = useStore()
  const c = useColours()
  const [view, setView] = React.useState<PantryView>(defaultView)
  const only = inStockOnly(state)
  const setOnly = (on: boolean) => local((s) => ({ ...s, pantryAll: !on }))
  const everything = pantryItems(state.items, true)
  const shown = pantryItems(state.items, !only)
  let title = ""
  let list: Item[] = []
  let caption = ""
  if (review) {
    title = "To review"
    list = everything.filter((i) => i.review).sort((a, b) => a.name.localeCompare(b.name))
  } else if (q) {
    title = `“${q}”`
    list = everything.filter((i) => namesOf(i).some((n) => containsText(n, q))).sort((a, b) => a.name.localeCompare(b.name))
  } else if (seeAll) {
    title = "All items"
    list = viewOf(shown, view)
    caption = `sorted ${SORTS.find((x) => x.value === view.sort)!.label}`
  } else {
    title = LOCATIONS.find((l) => l.value === loc)?.label ?? "Pantry"
    list = shown.filter((i) => (i.location ?? "none") === loc).sort(bySoonest)
    caption = "soonest use-by first"
  }
  const switchable = !review && !q
  const showLoc = !loc
  const counts = locationCounts(shown)

  const header = (
    <View style={{ gap: 12, paddingBottom: 10 }}>
      {switchable && <Toggle label="In stock only" value={only} onChange={setOnly} />}
      {seeAll && (
        <>
          <Segmented label="Sort" value={view.sort} onChange={(sort) => setView({ ...view, sort })} options={SORTS} />
          <View style={{ gap: 6 }}>
            <Label>Where</Label>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              <Chip label="All" on={view.location === null} onPress={() => setView({ ...view, location: null })} />
              {LOCATIONS.filter((l) => counts.get(l.value)).map((l) => (
                <Chip key={l.value} label={l.label} on={view.location === l.value} onPress={() => setView({ ...view, location: view.location === l.value ? null : l.value })} />
              ))}
            </ScrollView>
          </View>
          <View style={{ gap: 6 }}>
            <Label>Show</Label>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {SHOWS.map((x) => (
                <Chip
                  key={x.value}
                  label={x.label}
                  on={view.show === x.value}
                  onPress={() => {
                    const on = view.show !== x.value
                    setView({ ...view, show: on ? x.value : null })
                    // Out of stock can't show with In stock only on, so asking for it turns the switch off.
                    if (on && x.value === "out" && only) setOnly(false)
                  }}
                />
              ))}
            </ScrollView>
          </View>
        </>
      )}
    </View>
  )

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 12, paddingTop: 6 }}>
        <BackLink label="Pantry" onPress={() => router.back()} />
      </View>
      <View style={{ paddingHorizontal: space.screen, paddingBottom: 10, gap: 4 }}>
        <Display size={30}>{title}</Display>
        <Caption>{plural(list.length, "item")}{caption ? ` · ${caption}` : ""}</Caption>
      </View>
      <FlatList
        data={list}
        keyExtractor={(i) => i.id}
        ListHeaderComponent={header}
        contentContainerStyle={{ paddingHorizontal: space.screen, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item: i }) => {
          const sub = [showLoc ? locationLabel(i.location) : "", expiryText(soonest(i))].filter(Boolean).join(" · ")
          return (
            <Press onPress={() => router.push({ pathname: "/pantry/item/[id]", params: { id: i.id } })} accessibilityLabel={`${i.name}${i.review ? ", new" : ""}. ${phrase(i)}${sub ? `. ${sub}` : ""}`} style={{ minHeight: 68, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1, borderBottomColor: c.line, paddingVertical: 10 }}>
              <View style={{ flex: 1, gap: 3 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <Text style={{ fontFamily: font.medium, fontSize: 18, lineHeight: 23, color: c.ink }}>{i.name}</Text>
                  {i.review && <Pill label="New" tone="olive" />}
                </View>
                {!!sub && <Caption>{sub}</Caption>}
              </View>
              <Text style={{ fontFamily: font.regular, fontSize: 15, color: i.inStock > 0 ? c.ink : c.muted, maxWidth: "45%", textAlign: "right" }}>{phrase(i)}</Text>
            </Press>
          )
        }}
        ListEmptyComponent={
          <Caption style={{ paddingVertical: 20 }}>
            {review ? "Nothing to review." : q ? `Nothing in your pantry matches “${q}”.` : only && everything.length ? "Nothing in stock here. Turn off In stock only to see everything." : "Nothing here."}
          </Caption>
        }
      />
    </View>
  )
}

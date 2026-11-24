// A list of pantry items: one location (soonest use-by first), everything (See all, with sorting and filters),
// search results, or the New items to review. One location and See all follow the In stock only switch
// (Batch 2, 24 Nov 2026); search and To review always show everything, so nothing you look for is hidden.
// All items' sort and filters (and the switch) are in a Filters sheet from the button by its title, as on the
// shopping list (Isaac's change, 24 Nov 2026); one location keeps its switch on the page.
import { router, useLocalSearchParams } from "expo-router"
import { SlidersHorizontal } from "lucide-react-native"
import * as React from "react"
import { FlatList, Text, View } from "react-native"
import { containsText, locationLabel, namesOf, soonest, type Item } from "../../../../../prototypes/pantry-app/src/model"
import { useStore } from "../../../data/store"
import { defaultView, inStockOnly, pantryFiltersOn, pantryItems, SHOWS, SORTS, viewOf } from "../../../logic/pantry"
import { phrase, plural, expiryText } from "../../../logic/phrases"
import { BackLink, Caption, Display, IconButton, Pill, Press, Toggle } from "../../../ui/kit"
import { LOCATIONS } from "../../../ui/locations"
import { font, space, useColours } from "../../../ui/theme"

const bySoonest = (a: Item, b: Item) => (soonest(a) ?? "9999").localeCompare(soonest(b) ?? "9999") || a.name.localeCompare(b.name)

export default function Browse() {
  // `show` opens See all with a Show filter on (Home's Use soon and Low or out counts, Batch 5).
  const { loc, q, review, all: seeAll, show } = useLocalSearchParams<{ loc?: string; q?: string; review?: string; all?: string; show?: string }>()
  const { state, local } = useStore()
  const c = useColours()
  const view = state.pantryView ?? defaultView
  // Home's counts open All items with one Show filter, starting from no others.
  React.useEffect(() => {
    const s = SHOWS.find((x) => x.value === show)?.value
    if (s) local((st) => ({ ...st, pantryView: { ...defaultView, show: s } }))
  }, [show, local])
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
    // Out means none in stock, so it looks at everything whatever the switch says.
    list = viewOf(view.show === "out" ? everything : shown, view)
    const on = pantryFiltersOn(view, !only)
    caption = [`sorted ${SORTS.find((x) => x.value === view.sort)!.label}`, on ? `${on} ${on === 1 ? "filter" : "filters"} on` : ""].filter(Boolean).join(" · ")
  } else {
    title = LOCATIONS.find((l) => l.value === loc)?.label ?? "Pantry"
    list = shown.filter((i) => (i.location ?? "none") === loc).sort(bySoonest)
    caption = "soonest use-by first"
  }
  // One location keeps the switch on the page; All items has it in its Filters sheet.
  const switchable = !review && !q && !seeAll
  const showLoc = !loc
  const filtersOnNow = seeAll ? pantryFiltersOn(view, !only) : 0

  const header = (
    <View style={{ gap: 12, paddingBottom: 10 }}>
      {switchable && <Toggle label="In stock only" value={only} onChange={setOnly} />}
    </View>
  )

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 12, paddingTop: 6 }}>
        <BackLink label="Pantry" onPress={() => router.back()} />
      </View>
      <View style={{ paddingHorizontal: space.screen, paddingBottom: 10, flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Display size={30}>{title}</Display>
          <Caption>{plural(list.length, "item")}{caption ? ` · ${caption}` : ""}</Caption>
        </View>
        {seeAll && (
          <IconButton label={filtersOnNow ? `Filters, ${filtersOnNow} on` : "Filters"} filled={!!filtersOnNow} onPress={() => router.push("/pantry-filters")}>
            <SlidersHorizontal size={22} color={filtersOnNow ? c.onOlive : c.ink} strokeWidth={2} />
          </IconButton>
        )}
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
            {review ? "Nothing to review." : q ? `Nothing in your pantry matches “${q}”.` : only && everything.length ? seeAll ? "Nothing matches. Change the filters to see more." : "Nothing in stock here. Turn off In stock only to see everything." : "Nothing here."}
          </Caption>
        }
      />
    </View>
  )
}

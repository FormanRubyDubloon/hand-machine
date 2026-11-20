// A list of pantry items: one location (soonest use-by first), search results, or the New items to review.
import { router, useLocalSearchParams } from "expo-router"
import * as React from "react"
import { FlatList, Text, View } from "react-native"
import { containsText, locationLabel, namesOf, soonest, type Item } from "../../../../../prototypes/pantry-app/src/model"
import { useStore } from "../../../data/store"
import { phrase, plural, expiryText } from "../../../logic/phrases"
import { BackLink, Caption, Display, Pill, Press } from "../../../ui/kit"
import { LOCATIONS } from "../../../ui/locations"
import { font, space, useColours } from "../../../ui/theme"

const bySoonest = (a: Item, b: Item) => (soonest(a) ?? "9999").localeCompare(soonest(b) ?? "9999") || a.name.localeCompare(b.name)

export default function Browse() {
  const { loc, q, review } = useLocalSearchParams<{ loc?: string; q?: string; review?: string }>()
  const { state } = useStore()
  const c = useColours()
  const all = Object.values(state.items).filter((i) => !i.oneOff)
  let title = ""
  let list: Item[] = []
  if (review) {
    title = "To review"
    list = all.filter((i) => i.review).sort((a, b) => a.name.localeCompare(b.name))
  } else if (q) {
    title = `“${q}”`
    list = all.filter((i) => namesOf(i).some((n) => containsText(n, q))).sort((a, b) => a.name.localeCompare(b.name))
  } else {
    title = LOCATIONS.find((l) => l.value === loc)?.label ?? "Pantry"
    list = all.filter((i) => (i.location ?? "none") === loc).sort(bySoonest)
  }
  const showLoc = !loc
  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 12, paddingTop: 6 }}>
        <BackLink label="Pantry" onPress={() => router.back()} />
      </View>
      <View style={{ paddingHorizontal: space.screen, paddingBottom: 10, gap: 4 }}>
        <Display size={30}>{title}</Display>
        <Caption>{plural(list.length, "item")}{loc ? " · soonest use-by first" : ""}</Caption>
      </View>
      <FlatList
        data={list}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ paddingHorizontal: space.screen, paddingBottom: 40 }}
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
        ListEmptyComponent={<Caption style={{ paddingVertical: 20 }}>{review ? "Nothing to review." : q ? `Nothing in your pantry matches “${q}”.` : "Nothing here."}</Caption>}
      />
    </View>
  )
}

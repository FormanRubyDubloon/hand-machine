// HOME (Batch 5, 24 Nov 2026): the first tab, and where the app opens. The emblem, then what's worth knowing at a
// glance: how much is on the list, what to use soon and what's new to review (each a tile that opens it), the items
// going off soonest, and the recipes marked Want to cook. Pull down to sync, as on the other tabs.
import { router } from "expo-router"
import { ChevronRight } from "lucide-react-native"
import * as React from "react"
import { RefreshControl, ScrollView, Text, View } from "react-native"
import { recipeInfo, soonest } from "../../../../../prototypes/pantry-app/src/model"
import { minutesText } from "../../../../../prototypes/shared/src/pantry"
import { useStore } from "../../../data/store"
import { homeSummary } from "../../../logic/home"
import { expiryText, phrase, plural } from "../../../logic/phrases"
import { SignInEmblem } from "../../../ui/art"
import { Caption, Label, Press } from "../../../ui/kit"
import { font, radius, space, useColours } from "../../../ui/theme"

export default function Home() {
  const { state, pulling, pullToSync } = useStore()
  const c = useColours()
  const home = homeSummary(state)

  const tiles = [
    { key: "list", n: home.toBuy, label: home.toBuy === 1 ? "thing to buy" : "things to buy", sub: home.lowOrOut ? `${home.lowOrOut} low or out` : undefined, go: () => router.navigate("/list") },
    { key: "soon", n: home.useSoon.length, label: "to use soon", go: () => router.navigate({ pathname: "/pantry/browse", params: { all: "1", show: "soon" } }) },
    ...(home.toReview ? [{ key: "review", n: home.toReview, label: "new to review", go: () => router.navigate({ pathname: "/pantry/browse", params: { review: "1" } }) }] : []),
  ]

  const row = (key: string, title: string, sub: string, onPress: () => void, label: string) => (
    <Press key={key} onPress={onPress} accessibilityLabel={label} style={{ minHeight: 64, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1, borderBottomColor: c.line, paddingVertical: 10 }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontFamily: font.medium, fontSize: 18, color: c.ink }}>{title}</Text>
        <Caption>{sub}</Caption>
      </View>
      <ChevronRight size={20} color={c.muted} />
    </Press>
  )

  return (
    <ScrollView
      contentContainerStyle={{ paddingHorizontal: space.screen, paddingTop: 16, paddingBottom: 48, gap: 24 }}
      refreshControl={<RefreshControl refreshing={pulling} onRefresh={() => void pullToSync()} tintColor={c.muted} />}
    >
      <View style={{ alignItems: "center" }}>
        <SignInEmblem width={170} />
      </View>

      <View style={{ flexDirection: "row", gap: 10 }}>
        {tiles.map((t) => (
          <Press
            key={t.key}
            onPress={t.go}
            accessibilityRole="button"
            accessibilityLabel={`${t.n} ${t.label}${t.sub ? `, ${t.sub}` : ""}`}
            style={{ flex: 1, minHeight: 92, borderRadius: radius.base, borderWidth: 1, borderColor: c.stone, backgroundColor: c.panel, padding: 12, gap: 2 }}
          >
            <Text style={{ fontFamily: font.bold, fontSize: 30, lineHeight: 34, color: c.ink }}>{t.n}</Text>
            <Text style={{ fontFamily: font.medium, fontSize: 14, lineHeight: 18, color: c.ink }}>{t.label}</Text>
            {!!t.sub && <Caption style={{ fontSize: 13 }}>{t.sub}</Caption>}
          </Press>
        ))}
      </View>

      <View>
        <View style={{ paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: c.stone }}>
          <Label>Use soon</Label>
        </View>
        {home.useSoon.length ? (
          home.useSoon.slice(0, 6).map((i) => {
            const sub = [expiryText(soonest(i)), phrase(i)].filter(Boolean).join(" · ")
            return row(i.id, i.name, sub, () => router.navigate({ pathname: "/pantry/item/[id]", params: { id: i.id } }), `${i.name}. ${sub}`)
          })
        ) : (
          <Caption style={{ paddingVertical: 12 }}>Nothing goes off in the next two days.</Caption>
        )}
        {home.useSoon.length > 6 && (
          <Press fade onPress={tiles[1].go} style={{ minHeight: 44, justifyContent: "center" }}>
            <Text style={{ fontFamily: font.semibold, fontSize: 15, color: c.olive }}>See all {home.useSoon.length}</Text>
          </Press>
        )}
      </View>

      <View>
        <View style={{ paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: c.stone }}>
          <Label>Want to cook</Label>
        </View>
        {home.wantToCook.length ? (
          home.wantToCook.map((r) => {
            const short = recipeInfo(r, state.items).short.length
            const sub = [minutesText(r.minutes), short ? `Short of ${plural(short, "thing")}` : "Can cook now"].filter(Boolean).join(" · ")
            return row(r.id, r.name, sub, () => router.navigate({ pathname: "/recipes/[id]", params: { id: r.id } }), `${r.name}. ${sub}`)
          })
        ) : (
          <Caption style={{ paddingVertical: 12 }}>Nothing yet. Mark a recipe Want to cook and it shows here.</Caption>
        )}
      </View>
    </ScrollView>
  )
}

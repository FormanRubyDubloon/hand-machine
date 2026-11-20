// RECIPES: every recipe, with ✓ when you can cook it now or −n when you're short of n. "This shop" shows
// recipes with something on the current list (handoff: a working title, see open question 3).
import { router } from "expo-router"
import { Check, Search } from "lucide-react-native"
import * as React from "react"
import { FlatList, RefreshControl, Text, View } from "react-native"
import { containsText, needOf, recipeInfo } from "../../../../../prototypes/pantry-app/src/model"
import { minutesText } from "../../../../../prototypes/shared/src/pantry"
import { useStore } from "../../../data/store"
import { plural } from "../../../logic/phrases"
import { Caption, Field, Press, Segmented } from "../../../ui/kit"
import { font, space, useColours } from "../../../ui/theme"

type Show = "all" | "shop"

export default function Recipes() {
  const { state, status, pulling, pullToSync } = useStore()
  const c = useColours()
  const [q, setQ] = React.useState("")
  const [show, setShow] = React.useState<Show>("all")

  const rows = React.useMemo(() => {
    return state.recipes
      .filter((r) => !q.trim() || containsText(r.name, q) || r.ingredients.some((g) => containsText(g.text, q)))
      .map((r) => {
        const info = recipeInfo(r, state.items)
        const onList = new Set(r.ingredients.map((g) => g.itemId).filter((id) => id && state.items[id] && needOf(state.items[id]) > 0)).size
        return { r, short: info.short.length, onList }
      })
      .filter((x) => show === "all" || x.onList > 0)
      .sort((a, b) => (show === "shop" ? b.onList - a.onList : 0) || a.r.name.localeCompare(b.r.name))
  }, [state.recipes, state.items, q, show])

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: space.screen, paddingTop: 14, paddingBottom: 10, gap: 10 }}>
        <View>
          <Field value={q} onChangeText={setQ} placeholder="Find a recipe" accessibilityLabel="Find a recipe" style={{ paddingLeft: 42 }} returnKeyType="search" />
          <Search size={18} color={c.muted} style={{ position: "absolute", left: 14, top: 15 }} pointerEvents="none" />
        </View>
        <Segmented<Show> label="Show" value={show} onChange={setShow} options={[{ value: "all", label: "All" }, { value: "shop", label: "This shop" }]} />
      </View>
      <FlatList
        data={rows}
        keyExtractor={(x) => x.r.id}
        contentContainerStyle={{ paddingHorizontal: space.screen, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={pulling} onRefresh={() => void pullToSync()} tintColor={c.muted} />}
        renderItem={({ item: { r, short, onList } }) => {
          const sub = show === "shop" ? plural(onList, "thing") + " on the list" : [minutesText(r.minutes), `serves ${r.serves}`, r.wantToCook ? "want to cook" : ""].filter(Boolean).join(" · ")
          const status = short ? `Short of ${short}` : "Can cook now"
          return (
            <Press onPress={() => router.push({ pathname: "/recipes/[id]", params: { id: r.id } })} accessibilityLabel={`${r.name}. ${sub}. ${status}`} style={{ minHeight: 72, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1, borderBottomColor: c.line, paddingVertical: 10 }}>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={{ fontFamily: font.medium, fontSize: 18, lineHeight: 23, color: c.ink }}>{r.name}</Text>
                <Caption>{sub}</Caption>
              </View>
              {short ? (
                <Text style={{ fontFamily: font.semibold, fontSize: 17, color: c.muted }}>−{short}</Text>
              ) : (
                <Check size={22} color={c.olive} strokeWidth={2.5} />
              )}
            </Press>
          )
        }}
        ListEmptyComponent={<Caption style={{ paddingVertical: 20 }}>{q.trim() ? `No recipes match “${q.trim()}”.` : show === "shop" ? "Nothing on your list is in a recipe." : "No recipes yet."}</Caption>}
        ListFooterComponent={<Caption style={{ paddingVertical: 20 }}>To add a recipe, give it to Claude: paste it, share a link or send a file.</Caption>}
      />
    </View>
  )
}

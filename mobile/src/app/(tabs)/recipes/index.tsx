// RECIPES: every recipe, with ✓ when you can cook it now or −n when you're short of n. "This shop" shows
// recipes with something on the current list (handoff: a working title, see open question 3).
import { router } from "expo-router"
import { ArrowUpDown, Check, Search } from "lucide-react-native"
import * as React from "react"
import { FlatList, Modal, RefreshControl, Text, View } from "react-native"
import { containsText, needOf, recipeInfo } from "../../../../../prototypes/pantry-app/src/model"
import { minutesText } from "../../../../../prototypes/shared/src/pantry"
import { useStore } from "../../../data/store"
import { plural } from "../../../logic/phrases"
import { RECIPE_SORTS as SORTS, type RecipeSort as Sort } from "../../../logic/sort"
import { Caption, Field, IconButton, Press, Segmented } from "../../../ui/kit"
import { font, radius, space, useColours } from "../../../ui/theme"

type Show = "all" | "shop"
export default function Recipes() {
  const { state, status, pulling, pullToSync } = useStore()
  const c = useColours()
  const [q, setQ] = React.useState("")
  const [show, setShow] = React.useState<Show>("all")
  const [sort, setSort] = React.useState<Sort>("name")
  const [sorting, setSorting] = React.useState(false)
  const current = SORTS.find((x) => x.value === sort)!

  const rows = React.useMemo(() => {
    return state.recipes
      .filter((r) => !q.trim() || containsText(r.name, q) || r.ingredients.some((g) => containsText(g.text, q)))
      .map((r) => {
        const info = recipeInfo(r, state.items)
        const onList = new Set(r.ingredients.map((g) => g.itemId).filter((id) => id && state.items[id] && needOf(state.items[id]) > 0)).size
        return { r, short: info.short.length, onList }
      })
      .filter((x) => show === "all" || x.onList > 0)
      .sort((a, b) => (show === "shop" ? b.onList - a.onList : 0) || current.compare(a.r, b.r))
  }, [state.recipes, state.items, q, show, current])

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: space.screen, paddingTop: 14, paddingBottom: 10, gap: 10 }}>
        <View>
          <Field value={q} onChangeText={setQ} placeholder="Find a recipe" accessibilityLabel="Find a recipe" style={{ paddingLeft: 42 }} returnKeyType="search" />
          <Search size={18} color={c.muted} style={{ position: "absolute", left: 14, top: 15 }} pointerEvents="none" />
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Segmented<Show> label="Show" value={show} onChange={setShow} options={[{ value: "all", label: "All" }, { value: "shop", label: "This shop" }]} />
          </View>
          <IconButton label={`Sort, ${current.label}`} size={46} onPress={() => setSorting(true)}>
            <ArrowUpDown size={22} color={c.ink} strokeWidth={2} />
          </IconButton>
        </View>
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
      <SortMenu open={sorting} value={sort} onPick={(v) => { setSort(v); setSorting(false) }} onClose={() => setSorting(false)} />
    </View>
  )
}

function SortMenu({ open, value, onPick, onClose }: { open: boolean; value: Sort; onPick: (v: Sort) => void; onClose: () => void }) {
  const c = useColours()
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Press accessibilityLabel="Close" onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", padding: 16 }}>
        <View onStartShouldSetResponder={() => true} accessibilityRole="radiogroup" accessibilityLabel="Sort recipes" style={{ backgroundColor: c.bg, borderRadius: radius.dialog, paddingVertical: 8 }}>
          <Text accessibilityRole="header" style={{ fontFamily: font.semibold, fontSize: 20, color: c.ink, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 }}>Sort recipes</Text>
          {SORTS.map((o) => {
            const on = o.value === value
            return (
              <Press key={o.value} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => onPick(o.value)} style={{ minHeight: 52, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={{ fontFamily: on ? font.bold : font.medium, fontSize: 17, color: c.ink }}>{o.label}</Text>
                {on && <Check size={22} color={c.olive} strokeWidth={2.5} />}
              </Press>
            )
          })}
        </View>
      </Press>
    </Modal>
  )
}

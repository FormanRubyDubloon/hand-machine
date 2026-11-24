// SEARCH (full screen, from the header's search button; Batch 5, 24 Nov 2026). One field, results as you type, in
// three groups: On the list, Pantry and Recipes. Tapping a result opens it where it lives. The Pantry and Recipes
// tabs lost their own search fields for this. Before you type, it lists your recent searches (kept on this phone):
// a search is remembered when you open a result from it or press Search on the keyboard (Isaac's change).
import { router } from "expo-router"
import { BookOpen, ChevronRight, History, List, Package, Search as SearchIcon, type LucideIcon } from "lucide-react-native"
import * as React from "react"
import { ScrollView, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { needOf, soonest } from "../../../prototypes/pantry-app/src/model"
import { minutesText } from "../../../prototypes/shared/src/pantry"
import { useStore } from "../data/store"
import { rememberSearch, searchAll } from "../logic/search"
import { count, expiryText, phrase } from "../logic/phrases"
import { Caption, Field, Label, Press, type FieldRef } from "../ui/kit"
import { font, useColours } from "../ui/theme"

/** How many of each group show before "and n more". */
const SHOW = 8

export default function Search() {
  const { state, local } = useStore()
  const c = useColours()
  const insets = useSafeAreaInsets()
  const [q, setQ] = React.useState("")
  // autoFocus alone can lose to the screen sliding up, so focus again once it's there and the keyboard shows.
  const input = React.useRef<FieldRef>(null)
  React.useEffect(() => {
    const t = setTimeout(() => input.current?.focus(), 350)
    return () => clearTimeout(t)
  }, [])
  const recent = state.recentSearches ?? []
  const remember = () => local((s) => ({ ...s, recentSearches: rememberSearch(s.recentSearches, q) }))
  const results = searchAll(state, q)
  const none = !!q.trim() && !results.list.length && !results.pantry.length && !results.recipes.length

  // Close search, then open the thing in its own tab (or, for the list, its item sheet).
  const open = (go: () => void) => {
    remember()
    router.back()
    setTimeout(go, 0)
  }

  const row = (key: string, title: string, sub: string, onPress: () => void) => (
    <Press key={key} onPress={onPress} accessibilityLabel={`${title}. ${sub}`} style={{ minHeight: 60, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1, borderBottomColor: c.line, paddingVertical: 8 }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontFamily: font.medium, fontSize: 17, color: c.ink }}>{title}</Text>
        {!!sub && <Caption>{sub}</Caption>}
      </View>
      <ChevronRight size={20} color={c.muted} />
    </Press>
  )

  // Each group's heading has its section's icon (Isaac's change, 24 Nov 2026).
  const group = <T,>(title: string, Icon: LucideIcon, xs: T[], render: (x: T) => React.ReactNode) =>
    xs.length ? (
      <View key={title}>
        <View style={{ paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: c.stone, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Icon size={16} color={c.muted} strokeWidth={2} />
            <Label>{title}</Label>
          </View>
          <Label>{xs.length}</Label>
        </View>
        {xs.slice(0, SHOW).map(render)}
        {xs.length > SHOW && <Caption style={{ paddingTop: 8 }}>And {xs.length - SHOW} more. Type more to narrow it down.</Caption>}
      </View>
    ) : null

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top + 8 }}>
      <View style={{ paddingHorizontal: 20, flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Field ref={input} autoFocus value={q} onChangeText={setQ} placeholder="Search" accessibilityLabel="Search the list, pantry and recipes" returnKeyType="search" onSubmitEditing={remember} autoCorrect={false} style={{ paddingLeft: 42 }} />
          <SearchIcon size={18} color={c.muted} style={{ position: "absolute", left: 14, top: 15 }} pointerEvents="none" />
        </View>
        <Press fade onPress={() => router.back()} accessibilityLabel="Close search" style={{ minHeight: 44, justifyContent: "center" }}>
          <Text style={{ fontFamily: font.semibold, fontSize: 17, color: c.olive }}>Cancel</Text>
        </Press>
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{ padding: 20, gap: 24, paddingBottom: insets.bottom + 40 }}>
        {!q.trim() && <Caption>Type part of a name, or an ingredient to find recipes.</Caption>}
        {!q.trim() && recent.length > 0 && (
          <View>
            <View style={{ paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: c.stone, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Label>Recent</Label>
              <Press fade hitSlop={10} onPress={() => local((s) => ({ ...s, recentSearches: undefined }))} accessibilityLabel="Clear recent searches">
                <Text style={{ fontFamily: font.semibold, fontSize: 14, color: c.olive }}>Clear</Text>
              </Press>
            </View>
            {recent.map((r) => (
              <Press key={r} onPress={() => setQ(r)} accessibilityLabel={`Search for ${r} again`} style={{ minHeight: 52, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1, borderBottomColor: c.line }}>
                <History size={18} color={c.muted} />
                <Text style={{ flex: 1, fontFamily: font.medium, fontSize: 17, color: c.ink }}>{r}</Text>
              </Press>
            ))}
          </View>
        )}
        {none && <Caption>Nothing matches “{q.trim()}”.</Caption>}
        {group("On the list", List, results.list, (i) =>
          row(`l-${i.id}`, i.name, needOf(i) > 0 ? `${count(i, needOf(i))} to get` : "Got it this shop", () => open(() => router.navigate({ pathname: "/list-item/[id]", params: { id: i.id } }))),
        )}
        {group("Pantry", Package, results.pantry, (i) =>
          row(`p-${i.id}`, i.name, [i.inStock > 0 ? phrase(i) : "None left", expiryText(soonest(i))].filter(Boolean).join(" · "), () => open(() => router.navigate({ pathname: "/pantry/item/[id]", params: { id: i.id } }))),
        )}
        {group("Recipes", BookOpen, results.recipes, (r) =>
          row(`r-${r.id}`, r.name, [minutesText(r.minutes), `serves ${r.serves}`, r.wantToCook ? "want to cook" : ""].filter(Boolean).join(" · "), () => open(() => router.navigate({ pathname: "/recipes/[id]", params: { id: r.id } }))),
        )}
      </ScrollView>
    </View>
  )
}

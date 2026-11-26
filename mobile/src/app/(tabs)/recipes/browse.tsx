// A list of recipes from the Recipes landing page (26 Nov 2026; this was the tab's first page): one group (All
// recipes, Want to cook, Newly added, Recommended, This shop), with ✓ when you can cook it now or −n when you're
// short of n. The Filters button by the title opens the recipe filters (meal, time, tags) and, for All, Can cook
// now and Want to cook, the sort; the other lists keep their own order (26 Nov 2026).
import { router, useLocalSearchParams } from "expo-router"
import { Check, SlidersHorizontal } from "lucide-react-native"
import * as React from "react"
import { FlatList, RefreshControl, Text, View } from "react-native"
import { dateText } from "../../../../../prototypes/pantry-app/src/model"
import { minutesText } from "../../../../../prototypes/shared/src/pantry"
import { useStore } from "../../../data/store"
import { plural } from "../../../logic/phrases"
import { inGroup, matchesRecipe, recipeFiltersOn, recipeRows, sortableGroup, type RecipeGroup } from "../../../logic/recipes"
import { RECIPE_SORTS as SORTS } from "../../../logic/sort"
import { BackLink, Caption, Display, IconButton, Press } from "../../../ui/kit"
import { RECIPE_GROUPS } from "../../../ui/recipe-groups"
import { font, space, useColours } from "../../../ui/theme"

export default function RecipeList() {
  const params = useLocalSearchParams<{ group?: string }>()
  const group = RECIPE_GROUPS.find((g) => g.value === params.group) ?? RECIPE_GROUPS[0]
  const show: RecipeGroup = group.value
  const sortable = sortableGroup(show)
  const { state, pulling, pullToSync } = useStore()
  const c = useColours()
  const current = SORTS.find((x) => x.value === (state.recipeSort ?? "name")) ?? SORTS[0]
  const filter = state.recipeFilter
  const on = recipeFiltersOn(filter)
  const inList = React.useMemo(
    () => inGroup(recipeRows(state.recipes, state.items), show, sortable ? current.compare : SORTS[0].compare),
    [state.recipes, state.items, show, current, sortable],
  )
  const rows = inList.filter((x) => matchesRecipe(x.recipe, filter)).map((x) => ({ ...x, r: x.recipe }))
  const sorted = sortable && current.value !== "name"

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: space.screen, paddingTop: 6, paddingBottom: 10, gap: 4 }}>
        <BackLink label="Recipes" onPress={() => (router.canGoBack() ? router.back() : router.replace("/recipes"))} />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Display size={30}>{group.label}</Display>
          </View>
          <IconButton
            label={on ? `Filters, ${on} on` : "Filters"}
            size={46}
            filled={!!on || sorted}
            onPress={() => router.push({ pathname: "/recipe-filters", params: { group: show } })}
          >
            <SlidersHorizontal size={22} color={on || sorted ? c.onPrimary : c.ink} strokeWidth={2} />
          </IconButton>
        </View>
        <Caption>{[on ? `${rows.length} of ${plural(inList.length, "recipe")}` : plural(rows.length, "recipe"), sortable ? `sorted ${current.label}` : "", on ? `${on} ${on === 1 ? "filter" : "filters"} on` : ""].filter(Boolean).join(" · ")}</Caption>
      </View>
      <FlatList
        data={rows}
        keyExtractor={(x) => x.r.id}
        contentContainerStyle={{ paddingHorizontal: space.screen, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={pulling} onRefresh={() => void pullToSync()} tintColor={c.muted} />}
        renderItem={({ item: { r, short, onList, usesUp } }) => {
          const sub = show === "shop" ? plural(onList, "thing") + " on the list"
            : show === "recommended" && usesUp ? `Uses ${usesUp.name.toLowerCase()}, use by ${day(usesUp.date)}`
            : show === "new" && r.addedAt ? `Added ${day(r.addedAt.slice(0, 10))}`
            : [minutesText(r.minutes), `serves ${r.serves}`, r.wantToCook && show !== "want" ? "want to cook" : ""].filter(Boolean).join(" · ")
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
                <Check size={22} color={c.primary} strokeWidth={2.5} />
              )}
            </Press>
          )
        }}
        ListEmptyComponent={<Caption style={{ paddingVertical: 20 }}>{on && inList.length ? "Nothing in this list matches the filters." : EMPTY[show]}</Caption>}
        ListFooterComponent={<Caption style={{ paddingVertical: 20 }}>To add a recipe, give it to Claude: paste it, share a link or send a file.</Caption>}
      />
    </View>
  )
}

/** A date in a sentence: "today" and "tomorrow" in lower case, "28 Nov" as it is. */
const day = (iso: string) => {
  const t = dateText(iso)
  return t === "Today" || t === "Tomorrow" ? t.toLowerCase() : t
}

const EMPTY: Record<RecipeGroup, string> = {
  all: "No recipes yet.",
  cook: "You're short of something for every recipe. This shop shows the ones your list will cover.",
  want: "No recipes marked Want to cook. Mark one on its page.",
  new: "No recipes added in the last two weeks.",
  recommended: "Nothing in your pantry is going off soon.",
  shop: "Nothing on your list is in a recipe.",
}

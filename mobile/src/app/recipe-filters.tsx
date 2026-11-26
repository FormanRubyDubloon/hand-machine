// The recipe lists' filters (sheet; Isaac's change, 26 Nov 2026), in the Pantry's Filters style and with the web's
// recipe filters: Sort (for the lists that can be sorted), Meal, Time and Tags (any of them). Each choice applies at
// once. They're kept on this phone and shared by every recipe list. Counts are within the list it was opened from.
import { router, useLocalSearchParams } from "expo-router"
import * as React from "react"
import { ScrollView, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useStore } from "../data/store"
import { commonTags, inGroup, matchesRecipe, MEALS, recipeFiltersOn, recipeRows, sortableGroup, TIMES, type RecipeFilter } from "../logic/recipes"
import { RECIPE_SORTS } from "../logic/sort"
import { Button, Caption, Chip, Label, Segmented } from "../ui/kit"
import { RECIPE_GROUPS } from "../ui/recipe-groups"
import { SheetHeader } from "../ui/sheet"
import { useColours } from "../ui/theme"

export default function RecipeFilters() {
  const params = useLocalSearchParams<{ group?: string }>()
  const group = RECIPE_GROUPS.find((g) => g.value === params.group)?.value ?? "all"
  const { state, local } = useStore()
  const c = useColours()
  const insets = useSafeAreaInsets()
  const f = state.recipeFilter ?? {}
  const sort = state.recipeSort ?? "name"
  const set = (next: RecipeFilter) => local((s) => ({ ...s, recipeFilter: recipeFiltersOn(next) ? next : undefined }))
  const pool = inGroup(recipeRows(state.recipes, state.items), group, RECIPE_SORTS[0].compare).map((x) => x.recipe)
  const n = (p: RecipeFilter) => pool.filter((r) => matchesRecipe(r, { ...f, ...p })).length
  const shown = pool.filter((r) => matchesRecipe(r, f)).length
  const tags = commonTags(pool)
  const on = recipeFiltersOn(f)

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ paddingTop: 10 }}>
        <SheetHeader title="Filters" noDone />
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 24 }}>
        {sortableGroup(group) && (
          <View style={{ gap: 10 }}>
            <Label>Sort</Label>
            <Segmented label="Sort" value={sort} onChange={(v) => local((s) => ({ ...s, recipeSort: v === "name" ? undefined : v }))} options={RECIPE_SORTS.map((o) => ({ value: o.value, label: o.label }))} />
          </View>
        )}
        <View style={{ gap: 10 }}>
          <Label>Meal</Label>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <Chip label="All" on={!f.meal} onPress={() => set({ ...f, meal: undefined })} />
            {MEALS.map((m) => (
              <Chip key={m} label={`${m} · ${n({ meal: m })}`} on={f.meal === m} onPress={() => set({ ...f, meal: f.meal === m ? undefined : m })} />
            ))}
          </View>
        </View>
        <View style={{ gap: 10 }}>
          <Label>Time</Label>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <Chip label="Any" on={!f.time} onPress={() => set({ ...f, time: undefined })} />
            {TIMES.map((t) => (
              <Chip key={t.value} label={`${t.label} · ${n({ time: t.value })}`} on={f.time === t.value} onPress={() => set({ ...f, time: f.time === t.value ? undefined : t.value })} />
            ))}
          </View>
        </View>
        {tags.length > 0 && (
          <View style={{ gap: 10 }}>
            <Label>Tags</Label>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {tags.map((t) => {
                const picked = f.tags ?? []
                const isOn = picked.includes(t)
                return (
                  <Chip
                    key={t}
                    label={`${t[0].toUpperCase()}${t.slice(1)} · ${n({ tags: [t] })}`}
                    on={isOn}
                    onPress={() => set({ ...f, tags: isOn ? picked.filter((x) => x !== t) : [...picked, t] })}
                  />
                )
              })}
            </View>
            <Caption>Pick several to see recipes with any of them.</Caption>
          </View>
        )}
        <Caption>{on ? `Showing ${shown} of ${pool.length} recipes.` : `Showing every recipe in this list (${pool.length}).`}</Caption>
      </ScrollView>
      <View style={{ flexDirection: "row", gap: 12, paddingHorizontal: 20, paddingTop: 12, paddingBottom: insets.bottom + 12, borderTopWidth: 1, borderTopColor: c.line }}>
        <Button kind="secondary" label="Clear filters" disabled={!on && sort === "name"} onPress={() => local((s) => ({ ...s, recipeFilter: undefined, recipeSort: undefined }))} style={{ flex: 1 }} />
        <Button label="Done" onPress={() => router.back()} style={{ flex: 1 }} />
      </View>
    </View>
  )
}

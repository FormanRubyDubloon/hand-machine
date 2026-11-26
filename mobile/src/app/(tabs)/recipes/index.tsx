// RECIPES: a landing page like the Pantry's (Isaac's change, 26 Nov 2026), one card per group, each opening its list
// (recipes/browse): All recipes, Can cook now (nothing short), Want to cook, Newly added (the last two weeks), Recommended (uses food past or near
// its use-by, as Home's Use soon) and This shop (has something on the shopping list). Every card shows, even at 0.
import { router } from "expo-router"
import * as React from "react"
import { RefreshControl, ScrollView } from "react-native"
import { useStore } from "../../../data/store"
import { plural } from "../../../logic/phrases"
import { inGroup, recipeRows, type RecipeGroup } from "../../../logic/recipes"
import { RECIPE_GROUPS as GROUPS } from "../../../ui/recipe-groups"
import { RECIPE_SORTS } from "../../../logic/sort"
import { Caption } from "../../../ui/kit"
import { LandingCard } from "../../../ui/landing"
import { space, useColours } from "../../../ui/theme"

export default function Recipes() {
  const { state, pulling, pullToSync } = useStore()
  const c = useColours()
  const rows = React.useMemo(() => recipeRows(state.recipes, state.items), [state.recipes, state.items])
  const byName = RECIPE_SORTS[0].compare

  const sub = (g: RecipeGroup, list: ReturnType<typeof inGroup>) => {
    if (g === "all") return "Everything you've saved"
    if (g === "cook") return "You have everything for these"
    if (g === "want") return "Recipes you've marked to cook"
    if (g === "new") return "Added in the last two weeks"
    if (g === "recommended") return list[0] ? `Uses ${list[0].usesUp!.name.toLowerCase()} before it goes off` : "Nothing's going off soon"
    if (g === "shop") return "Use what's on your list"
    return undefined
  }

  return (
    <ScrollView
      contentContainerStyle={{ padding: space.screen, gap: 10, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={pulling} onRefresh={() => void pullToSync()} tintColor={c.muted} />}
    >
      {GROUPS.map((g) => {
        const list = inGroup(rows, g.value, byName)
        const s = sub(g.value, list)
        return (
          <LandingCard
            key={g.value}
            icon={g.icon}
            label={g.label}
            count={list.length}
            sub={s}
            a11y={`${g.label}, ${plural(list.length, "recipe")}${s ? `. ${s}` : ""}`}
            onPress={() => router.push({ pathname: "/recipes/browse", params: { group: g.value } })}
          />
        )
      })}
      <Caption style={{ paddingTop: 10 }}>To add a recipe, give it to Claude: paste it, share a link or send a file.</Caption>
    </ScrollView>
  )
}

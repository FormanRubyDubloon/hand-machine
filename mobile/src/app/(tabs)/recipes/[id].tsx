// RECIPE: where you cook from. What you have and what you're short of, servings that scale every amount,
// putting ingredients on the list, the method, Want to cook, Cooked it and (pinned at the bottom) Start cooking.
import { router, useLocalSearchParams } from "expo-router"
import { Plus } from "lucide-react-native"
import * as React from "react"
import { ScrollView, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { isBulk, isWater, measureText, needOf, recipeInfo, type IngredientRow, type Recipe } from "../../../../../prototypes/pantry-app/src/model"
import { minutesText } from "../../../../../prototypes/shared/src/pantry"
import { useStore } from "../../../data/store"
import { addAllMissing, addIngredient, setIngredientQty, toggleWant } from "../../../logic/actions"
import { phrase, plural } from "../../../logic/phrases"
import { BackLink, Button, Caption, Display, IconButton, Label, Stepper } from "../../../ui/kit"
import { TimerStrip } from "../../../ui/timers"
import { font, space, useColours } from "../../../ui/theme"

/** How many of this item the recipe has put on the list. */
const onListFor = (row: IngredientRow, recipe: Recipe) =>
  (row.item?.entries ?? []).filter((e) => e.source.kind === "recipe" && e.source.recipe === recipe.name).reduce((n, e) => n + e.qty, 0)

/** The status line under an ingredient, said plainly. */
function statusOf(row: IngredientRow): { text: string; short: boolean } {
  const i = row.item
  if (!i) return isWater(row.ing.text) ? { text: "Always to hand", short: false } : { text: "Not in your pantry yet", short: true }
  if (isBulk(i) || row.ing.partial) {
    if (i.inStock > 0) return { text: `Have ${phrase(i).toLowerCase()}`, short: false }
    return { text: "None left", short: true }
  }
  if (row.status === "have") return { text: `Have ${phrase(i).toLowerCase()}`, short: false }
  const missing = row.need - i.inStock
  return { text: `${i.inStock > 0 ? `Have ${i.inStock}` : "None left"} · short of ${missing}`, short: true }
}

export default function RecipePage() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { state, change, say } = useStore()
  const c = useColours()
  const insets = useSafeAreaInsets()
  const recipe = state.recipes.find((r) => r.id === id)
  const [serves, setServes] = React.useState(recipe?.serves ?? 2)
  if (!recipe) {
    return (
      <View style={{ flex: 1, padding: space.screen, gap: 12 }}>
        <BackLink label="Recipes" onPress={() => router.back()} />
        <Caption>This recipe isn't here any more.</Caption>
      </View>
    )
  }
  const factor = serves / (recipe.serves || 1)
  const info = recipeInfo(recipe, state.items, factor)
  const short = info.short.length
  const canAddAll = info.rows.some((r) => !r.ing.optional && (r.status === "short" || r.status === "little" || (r.status === "unlinked" && !isWater(r.ing.text))) && !(r.item && onListFor(r, recipe) > 0))
  const meta = [minutesText(recipe.minutes), ...(recipe.tags ?? []).map((t) => t.toLowerCase()), recipe.meal?.toLowerCase()].filter(Boolean).join(" · ")
  const note = (title: string) => ({ title, detail: `For ${recipe.name}`, recipeId: recipe.id })

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 12, paddingTop: 6, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <BackLink label="Recipes" onPress={() => router.back()} />
        {recipe.wantToCook && <Caption style={{ paddingRight: 8 }}>Saved for offline</Caption>}
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: space.screen, paddingBottom: 24, gap: 18 }}>
        <View style={{ gap: 8, paddingTop: 4 }}>
          <Display size={24}>{recipe.name}</Display>
          <Caption style={{ fontSize: 15 }}>{meta}</Caption>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Label>Serves</Label>
          <Stepper label="Servings" value={serves} min={1} onChange={setServes} />
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <Text style={{ flex: 1, fontFamily: font.medium, fontSize: 16, color: c.ink }}>
            {short ? `You have ${info.have} of ${info.needed}. Short of ${short}.` : "You have everything."}
          </Text>
          {canAddAll && (
            <Button
              kind="secondary"
              height={44}
              label="Add all missing"
              onPress={() => {
                let added = 0
                change((s) => {
                  const r = addAllMissing(s, recipe, factor)
                  added = r.added
                  return r.state
                }, note(`Added what's missing for ${recipe.name} to the shopping list`))
                say(added ? `Added ${plural(added, "missing thing")} to the list.` : "Everything you're short of is already on the list.")
              }}
            />
          )}
        </View>

        <View style={{ borderTopWidth: 1, borderTopColor: c.line }}>
          {info.rows.map((row, k) => {
            const st = statusOf(row)
            const qty = onListFor(row, recipe)
            const label = row.item?.name.toLowerCase() ?? row.text
            const warn = row.status === "little" && row.item?.packSize && row.required && row.capacity
              ? `Needs ${measureText(row.required, row.item.packSize.measure)}. Your ${row.item.inStock === 1 ? row.item.unit?.[0] ?? "pack" : plural(row.item.inStock, row.item.unit?.[0] ?? "pack", row.item.unit?.[1])} ${row.item.inStock === 1 ? "holds" : "hold"} ${measureText(row.capacity, row.item.packSize.measure)} at most.`
              : ""
            return (
              <View key={k} style={{ minHeight: 68, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.line, gap: 6 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={{ fontFamily: font.medium, fontSize: 18, lineHeight: 23, color: c.ink }}>{row.text}{row.ing.optional ? " (optional)" : ""}</Text>
                    <Text style={{ fontFamily: st.short ? font.bold : font.regular, fontSize: 14, lineHeight: 19, color: st.short ? c.ink : c.muted }}>
                      {st.text}{row.item && needOf(row.item) > 0 ? ` · ${needOf(row.item)} on the list` : ""}
                    </Text>
                  </View>
                  {qty > 0 ? (
                    <Stepper label={`${label} on the list`} value={qty} min={0} onChange={(n) => change((s) => setIngredientQty(s, recipe, row.item!.id, n), { ...note(n < 1 ? `Took ${label} off the shopping list` : `${row.item!.name} on the list: ${n}`), key: `ingredient:${recipe.id}:${row.item!.id}` })} />
                  ) : isWater(row.ing.text) && !row.item ? null : (
                    <IconButton
                      label={`Add ${label} to the list`}
                      filled={st.short}
                      onPress={() => {
                        change((s) => addIngredient(s, s.recipes.find((r) => r.id === recipe.id) ?? recipe, k), note(`Added ${label} to the shopping list`))
                        say(row.item ? `Added ${label} to the list.` : `Added ${label} to the list. It joins your pantry once you buy it.`)
                      }}
                    >
                      <Plus size={22} color={st.short ? c.onOlive : c.ink} strokeWidth={2} />
                    </IconButton>
                  )}
                </View>
                {!!warn && <Text style={{ fontFamily: font.regular, fontSize: 14, color: c.danger }}>{warn}</Text>}
              </View>
            )
          })}
        </View>

        <View style={{ flexDirection: "row", gap: 10 }}>
          {/* Want to cook and Start cooking swapped places (Isaac's change, 24 Nov 2026): Start cooking is the pinned
              button at the bottom, Want to cook sits beside Cooked it and shows a tick when it's on. */}
          <Button
            kind="secondary"
            style={{ flex: 1 }}
            accessibilityState={{ selected: recipe.wantToCook }}
            accessibilityLabel={recipe.wantToCook ? "On your Want to cook list. Take it off" : "Want to cook"}
            label={recipe.wantToCook ? "Want to cook ✓" : "Want to cook"}
            onPress={() => {
              let added = 0
              change((s) => {
                const r = toggleWant(s, s.recipes.find((x) => x.id === recipe.id) ?? recipe, factor)
                added = r.added
                return r.state
              }, note(recipe.wantToCook ? `No longer want to cook ${recipe.name}` : `Want to cook ${recipe.name}`))
              if (!recipe.wantToCook) say(added ? `Saved. ${plural(added, "thing")} you're short of went on the list.` : "Saved to your Want to cook list.")
            }}
          />
          <Button kind="secondary" label="Cooked it" style={{ flex: 1 }} onPress={() => router.push({ pathname: "/cooked/[id]", params: { id: recipe.id, serves: String(serves) } })} />
        </View>

        <View style={{ gap: 12 }}>
          <Label>Method</Label>
          {/* Every running timer, this recipe's included: the steps here have no timer buttons any more (Isaac's
              change, 24 Nov 2026), so timers are started from the cooking view. */}
          <TimerStrip />
          {recipe.method.length ? recipe.method.map((step, k) => (
            <View key={k} style={{ flexDirection: "row", gap: 12 }}>
              <Text style={{ width: 22, fontFamily: font.bold, fontSize: 17, lineHeight: 24, color: c.muted }}>{k + 1}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: font.regular, fontSize: 17, lineHeight: 24, color: c.ink }}>{step}</Text>
              </View>
            </View>
          )) : <Caption>No method saved for this recipe.</Caption>}
        </View>
      </ScrollView>
      <View style={{ paddingHorizontal: space.screen, paddingTop: 10, paddingBottom: insets.bottom + 12, borderTopWidth: 1, borderTopColor: c.line }}>
        <Button kind="primary" height={60} label="Start cooking" onPress={() => router.push({ pathname: "/cooking/[id]", params: { id: recipe.id, serves: String(serves) } })} />
      </View>
    </View>
  )
}

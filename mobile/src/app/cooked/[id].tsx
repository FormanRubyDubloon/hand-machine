// What did you use? (sheet). Counted ingredients are filled in with the recipe's amounts (no more than you
// have), bulk ones have a "Finished it" tick that takes one pack off. Update stock applies it all.
import { router, useLocalSearchParams } from "expo-router"
import { Check } from "lucide-react-native"
import * as React from "react"
import { ScrollView, Text, View } from "react-native"
import { isBulk, isWater, recipeInfo } from "../../../../prototypes/pantry-app/src/model"
import { useStore } from "../../data/store"
import { cooked } from "../../logic/actions"
import { phrase } from "../../logic/phrases"
import { Body, Button, Caption, Press, Stepper } from "../../ui/kit"
import { font, radius, useColours } from "../../ui/theme"

export default function Cooked() {
  const { id, serves } = useLocalSearchParams<{ id: string; serves?: string }>()
  const { state, change, say } = useStore()
  const c = useColours()
  const recipe = state.recipes.find((r) => r.id === id)
  const serv = Number(serves) || recipe?.serves || 1
  const info = recipe ? recipeInfo(recipe, state.items, serv / (recipe.serves || 1)) : null
  // One row per pantry item (a recipe can use the same item twice).
  const rows = React.useMemo(() => {
    const seen = new Set<string>()
    return (info?.rows ?? []).filter((r) => {
      if (!r.item) return !isWater(r.ing.text)
      if (seen.has(r.item.id)) return false
      seen.add(r.item.id)
      return true
    })
  }, [info])
  const [counts, setCounts] = React.useState<Record<string, number>>(() =>
    Object.fromEntries(rows.filter((r) => r.item && !isBulk(r.item) && !r.ing.partial).map((r) => [r.item!.id, Math.min(r.need, r.item!.inStock)])),
  )
  const [finished, setFinished] = React.useState<Record<string, boolean>>({})
  if (!recipe) return null

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
        <View style={{ gap: 6 }}>
          <Text accessibilityRole="header" style={{ fontFamily: font.serif, fontWeight: "700", fontSize: 26, letterSpacing: 0.9, textTransform: "uppercase", color: c.ink }}>What did you use?</Text>
          <Body colour={c.muted}>{recipe.name}, for {serv}. Check the amounts, then update your stock.</Body>
        </View>
        <View style={{ borderTopWidth: 1, borderTopColor: c.line }}>
          {rows.map((r, k) => {
            const i = r.item
            const name = i?.name ?? r.text
            let right: React.ReactNode = null
            let sub = ""
            if (!i) sub = "Not in your pantry, so nothing to take off"
            else if (isBulk(i) || r.ing.partial) {
              sub = i.inStock > 0 ? `Have ${phrase(i).toLowerCase()}. Tick if you finished one.` : "None left, so nothing to take off"
              const on = !!finished[i.id]
              right = i.inStock > 0 ? (
                <Press accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={`Finished the ${name.toLowerCase()}`} onPress={() => setFinished((f) => ({ ...f, [i.id]: !on }))} style={{ flexDirection: "row", alignItems: "center", gap: 8, minHeight: 44 }}>
                  <View style={{ width: 28, height: 28, borderRadius: radius.base, borderWidth: 1, borderColor: c.primary, backgroundColor: on ? c.primary : "transparent", alignItems: "center", justifyContent: "center" }}>
                    {on && <Check size={18} color={c.onPrimary} strokeWidth={3} />}
                  </View>
                  <Text style={{ fontFamily: font.medium, fontSize: 15, color: c.ink }}>Finished it</Text>
                </Press>
              ) : null
            } else if (i.inStock <= 0) {
              sub = "None left, so nothing to take off"
            } else {
              sub = `Recipe uses ${r.need} · you have ${i.inStock}`
              right = <Stepper label={`How many ${name.toLowerCase()} used`} value={counts[i.id] ?? 0} min={0} max={i.inStock} onChange={(n) => setCounts((x) => ({ ...x, [i.id]: n }))} />
            }
            return (
              <View key={k} style={{ minHeight: 68, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1, borderBottomColor: c.line, paddingVertical: 10 }}>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={{ fontFamily: font.medium, fontSize: 18, color: c.ink }}>{name}</Text>
                  <Caption>{sub}</Caption>
                </View>
                {right}
              </View>
            )
          })}
        </View>
        <Button
          label="Update stock"
          height={60}
          onPress={() => {
            const done = Object.keys(finished).filter((k) => finished[k])
            change((s) => cooked(s, recipe, counts, done), { title: `Cooked ${recipe.name}`, detail: "Stock updated on the phone", recipeId: recipe.id })
            router.back()
            say(`Cooked ${recipe.name}. Stock updated.`)
          }}
        />
        <Button kind="quiet" label="Cancel" onPress={() => router.back()} />
      </ScrollView>
    </View>
  )
}

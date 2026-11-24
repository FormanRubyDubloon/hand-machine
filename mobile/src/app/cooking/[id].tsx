// The cooking view (full screen, always dark): one step at a time in big type, with the screen kept awake.
// The last step's button opens "What did you use?". A step that names a time has a timer button under it, and every
// other timer running (other steps, other recipes) shows above the step (Batch 6, 24 Nov 2026).
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake"
import { router, useLocalSearchParams } from "expo-router"
import * as React from "react"
import { Platform, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { recipeInfo } from "../../../../prototypes/pantry-app/src/model"
import { useStore } from "../../data/store"
import { ingredientsForStep } from "../../logic/steps"
import { Button, Press } from "../../ui/kit"
import { StepTimers, TimerStrip } from "../../ui/timers"
import { focus, font } from "../../ui/theme"

export default function Cooking() {
  // Keeps the screen on while this view is open (the phone only; browsers may refuse a wake lock).
  React.useEffect(() => {
    if (Platform.OS === "web") return
    void activateKeepAwakeAsync("cooking").catch(() => {})
    return () => void deactivateKeepAwake("cooking").catch(() => {})
  }, [])
  const { id, serves } = useLocalSearchParams<{ id: string; serves?: string }>()
  const { state } = useStore()
  const insets = useSafeAreaInsets()
  const recipe = state.recipes.find((r) => r.id === id)
  const [n, setN] = React.useState(0)
  const steps = recipe?.method.length ? recipe.method : ["This recipe has no method saved. Cook it your way, then record what you used."]
  const last = n === steps.length - 1
  const step = steps[Math.min(n, steps.length - 1)]
  const big = step.length < 90
  // The recipe's ingredients at the servings chosen on the recipe page, then the ones this step names.
  const factor = recipe && serves ? Number(serves) / (recipe.serves || 1) : 1
  const rows = recipe ? recipeInfo(recipe, state.items, factor || 1).rows.map((r) => ({ text: r.text, name: r.item?.name, otherNames: r.item?.otherNames })) : []
  const uses = recipe?.method.length ? ingredientsForStep(step, rows) : []

  return (
    <View style={{ flex: 1, backgroundColor: focus.bg, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16, paddingHorizontal: 20 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ fontFamily: font.semibold, fontSize: 14, letterSpacing: 1.2, textTransform: "uppercase", color: focus.place }}>Step {n + 1} of {steps.length}</Text>
        <Press fade onPress={() => router.back()} accessibilityLabel="Close" style={{ minHeight: 44, minWidth: 64, alignItems: "flex-end", justifyContent: "center" }}>
          <Text style={{ fontFamily: font.semibold, fontSize: 16, color: focus.gold }}>Close</Text>
        </Press>
      </View>
      <View style={{ flexDirection: "row", gap: 4, marginTop: 8 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {steps.map((_, k) => <View key={k} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: k <= n ? focus.gold : focus.line }} />)}
      </View>
      <View style={{ marginTop: 12 }}>
        <TimerStrip dark except={(t) => t.recipeId === id && t.step === n} />
      </View>
      <View style={{ flex: 1, justifyContent: "center", gap: 20 }}>
        <Text accessibilityLiveRegion="polite" style={{ fontFamily: font.medium, fontSize: big ? 32 : 26, lineHeight: big ? 42 : 34, color: focus.ink }}>{step}</Text>
        {recipe && recipe.method.length > 0 && <StepTimers dark recipe={recipe} step={n} text={step} />}
      </View>
      {uses.length > 0 && (
        <View accessibilityLabel={`For this step: ${uses.map((u) => u.text).join(", ")}`} accessible style={{ marginBottom: 16, gap: 4 }}>
          {/* A bullet for each, in a muted colour (Isaac's change, 24 Nov 2026). */}
          {uses.map((u, k) => (
            <View key={k} style={{ flexDirection: "row", gap: 10 }}>
              <Text style={{ fontFamily: font.regular, fontSize: 17, lineHeight: 23, color: "rgba(242,239,227,0.35)" }}>•</Text>
              <Text style={{ flex: 1, fontFamily: font.regular, fontSize: 17, lineHeight: 23, color: focus.label }}>{u.text}</Text>
            </View>
          ))}
        </View>
      )}
      {uses.length === 0 && <View style={{ height: 16 }} />}
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Button kind="goldOutline" height={72} label="Back" disabled={n === 0} onPress={() => setN((x) => Math.max(0, x - 1))} style={{ flex: 1 }} />
        <Button
          kind="gold"
          height={72}
          label={last ? "Done, record what I used" : "Next step"}
          style={{ flex: 2 }}
          onPress={() => {
            if (!last) return setN((x) => x + 1)
            router.back()
            router.push({ pathname: "/cooked/[id]", params: { id, serves: serves ?? "" } })
          }}
        />
      </View>
    </View>
  )
}

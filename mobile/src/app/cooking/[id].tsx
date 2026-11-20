// The cooking view (full screen, always dark): one step at a time in big type, with the screen kept awake.
// The last step's button opens "What did you use?".
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake"
import { router, useLocalSearchParams } from "expo-router"
import * as React from "react"
import { Platform, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useStore } from "../../data/store"
import { Button, Press } from "../../ui/kit"
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
      <View style={{ flex: 1, justifyContent: "center" }}>
        <Text accessibilityLiveRegion="polite" style={{ fontFamily: font.medium, fontSize: big ? 32 : 26, lineHeight: big ? 42 : 34, color: focus.ink }}>{step}</Text>
      </View>
      <Text style={{ fontFamily: font.regular, fontSize: 14, color: focus.label, textAlign: "center", marginBottom: 12 }}>The screen stays on while you cook.</Text>
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

// A card on a section's landing page (Pantry: All items and the locations; Recipes: its groups, 26 Nov 2026).
import type { LucideIcon } from "lucide-react-native"
import * as React from "react"
import { Text, View } from "react-native"
import { Caption, Press } from "./kit"
import { font, radius, useColours } from "./theme"

export function LandingCard({ icon: Icon, label, count, sub, a11y, onPress }: { icon: LucideIcon; label: string; count: number; sub?: string; a11y: string; onPress: () => void }) {
  const c = useColours()
  return (
    <Press onPress={onPress} accessibilityLabel={a11y} style={{ minHeight: 92, borderWidth: 1, borderColor: c.primary, borderRadius: radius.base, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 14 }}>
      <View style={{ width: 48, height: 48, borderRadius: radius.base, backgroundColor: c.panel, alignItems: "center", justifyContent: "center" }}>
        <Icon size={26} color={c.ink} strokeWidth={1.75} />
      </View>
      <View style={{ flex: 1, gap: 2, paddingVertical: 12 }}>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ fontFamily: font.serif, fontWeight: "700", fontSize: 26, letterSpacing: 1, textTransform: "uppercase", color: c.ink }}>{label}</Text>
        {!!sub && <Caption>{sub}</Caption>}
      </View>
      <Text style={{ fontFamily: font.regular, fontSize: 20, color: c.muted }}>{count}</Text>
    </Press>
  )
}

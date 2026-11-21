// The top of a sheet or full-screen view: a title (or a back link) and Done. No large heading (handoff, Settings).
import { router } from "expo-router"
import * as React from "react"
import { Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { BackLink, Press } from "./kit"
import { font, useColours } from "./theme"

export function SheetHeader({ title, back, doneLabel = "Done", onDone, full, noDone }: {
  title?: string; back?: { label: string; onPress: () => void }; doneLabel?: string; onDone?: () => void; full?: boolean
  /** Leave out Done, for a sheet that has its own buttons at the foot. */
  noDone?: boolean
}) {
  const c = useColours()
  const insets = useSafeAreaInsets()
  return (
    <View style={{ paddingTop: (full ? insets.top : 0) + 10, paddingHorizontal: 20, paddingBottom: 6, minHeight: (full ? insets.top : 0) + 60, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      {back ? <BackLink label={back.label} onPress={back.onPress} /> : <Text accessibilityRole="header" style={{ fontFamily: font.semibold, fontSize: 17, color: c.ink }}>{title}</Text>}
      {!noDone && (
        <Press fade onPress={onDone ?? (() => router.back())} accessibilityLabel={doneLabel} style={{ minHeight: 44, minWidth: 56, alignItems: "flex-end", justifyContent: "center" }}>
          <Text style={{ fontFamily: font.semibold, fontSize: 17, color: c.olive }}>{doneLabel}</Text>
        </Press>
      )}
    </View>
  )
}

// The toast: dark, at the bottom, 3.2 s (5 s with Undo). A new one replaces the old. Read out by VoiceOver.
import * as React from "react"
import { AccessibilityInfo, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useStore } from "../data/store"
import { Press } from "./kit"
import { focus, font, radius } from "./theme"

export function ToastView() {
  const { toast, dismissToast } = useStore()
  const insets = useSafeAreaInsets()
  React.useEffect(() => {
    if (toast) AccessibilityInfo.announceForAccessibility(toast.message)
  }, [toast])
  if (!toast) return null
  return (
    <View pointerEvents="box-none" style={{ position: "absolute", left: 16, right: 16, bottom: insets.bottom + 16 }}>
      <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={{ backgroundColor: focus.toast, borderRadius: radius.dialog, paddingVertical: 12, paddingLeft: 16, paddingRight: toast.undo ? 8 : 16, flexDirection: "row", alignItems: "center", gap: 12, shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6 }}>
        <Text style={{ flex: 1, fontFamily: font.regular, fontSize: 15, lineHeight: 20, color: focus.ink }}>{toast.message}</Text>
        {toast.undo && (
          <Press
            fade
            onPress={() => {
              const undo = toast.undo
              dismissToast()
              undo?.()
            }}
            style={{ minHeight: 44, paddingHorizontal: 12, justifyContent: "center" }}
          >
            <Text style={{ fontFamily: font.semibold, fontSize: 15, letterSpacing: 0.9, textTransform: "uppercase", color: focus.gold }}>Undo</Text>
          </Press>
        )}
      </View>
    </View>
  )
}

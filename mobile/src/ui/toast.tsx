// The toast: dark, at the bottom, 3.2 s (5 s with Undo). A new one replaces the old. Read out by VoiceOver.
// The popup (Isaac's design, 27 Nov 2026) takes its place for the item sheet's Got all and Skip: a dark card in the middle
// with a round orange tick or skip mark, the message and Undo. It slides up as it fades in, stays two seconds, then goes
// the same way back. Ticking a row on the list still uses the toast.
import { Check, SkipForward } from "lucide-react-native"
import * as React from "react"
import { AccessibilityInfo, Animated, Easing, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { FullWindowOverlay } from "react-native-screens"
import { POPUP_HOLD_MS, POPUP_MOVE_MS, TOAST_UNDO_MS, type Toast, useStore } from "../data/store"
import { Press } from "./kit"
import { font, radius, useColours } from "./theme"

export function ToastView() {
  const { focus } = useColours()
  const { toast, dismissToast } = useStore()
  const insets = useSafeAreaInsets()
  React.useEffect(() => {
    if (toast) AccessibilityInfo.announceForAccessibility(toast.message)
  }, [toast])
  if (!toast) return null
  if (toast.popup) return <Popup key={toast.id} toast={toast} onDone={dismissToast} />
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

function Popup({ toast, onDone }: { toast: Toast; onDone: () => void }) {
  const { focus } = useColours()
  const shown = React.useRef(new Animated.Value(0)).current
  const [still, setStill] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    void Promise.all([AccessibilityInfo.isReduceMotionEnabled(), AccessibilityInfo.isScreenReaderEnabled()]).then(([reduce, reader]) => {
      if (cancelled) return
      setStill(reduce)
      const move = (to: number, done?: () => void) =>
        Animated.timing(shown, { toValue: to, duration: POPUP_MOVE_MS, easing: to ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic), useNativeDriver: true }).start(({ finished }) => finished && done?.())
      move(1)
      // With VoiceOver on, two seconds is too short to reach Undo, so it stays as long as the toast's Undo does.
      timer = setTimeout(() => move(0, onDone), POPUP_MOVE_MS + (reader && toast.undo ? TOAST_UNDO_MS : POPUP_HOLD_MS))
    })
    return () => {
      cancelled = true
      clearTimeout(timer)
      shown.stopAnimation()
    }
  }, [shown, toast, onDone])

  const Icon = toast.popup === "skip" ? SkipForward : Check
  // Reduce Motion: fade only, no slide.
  const translateY = still ? 0 : shown.interpolate({ inputRange: [0, 1], outputRange: [48, 0] })
  return (
    <FullWindowOverlay>
      <View pointerEvents="box-none" style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0, alignItems: "center", justifyContent: "center" }}>
        <Animated.View
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={{ opacity: shown, transform: [{ translateY }], width: 224, borderRadius: 32, paddingTop: 36, paddingBottom: 36, paddingHorizontal: 20, alignItems: "center", gap: 20, shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 8 }}
        >
          {/* The card is slightly see-through, as drawn, so the list shows faintly behind it. */}
          <View style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0, borderRadius: 32, backgroundColor: focus.toast, opacity: 0.94 }} />
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: focus.badge, alignItems: "center", justifyContent: "center" }}>
            <Icon size={30} color={focus.onBadge} strokeWidth={toast.popup === "skip" ? 2.5 : 3} />
          </View>
          <Text style={{ fontFamily: font.semibold, fontSize: 17, lineHeight: 22, color: focus.ink, textAlign: "center" }}>{toast.message}</Text>
          {toast.undo && (
            <Press
              fade
              onPress={() => {
                const undo = toast.undo
                onDone()
                undo?.()
              }}
              style={{ minHeight: 44, paddingHorizontal: 20, borderWidth: 1, borderColor: focus.gold, borderRadius: radius.base, justifyContent: "center" }}
            >
              <Text style={{ fontFamily: font.semibold, fontSize: 15, letterSpacing: 0.9, textTransform: "uppercase", color: focus.gold }}>Undo</Text>
            </Press>
          )}
        </Animated.View>
      </View>
    </FullWindowOverlay>
  )
}

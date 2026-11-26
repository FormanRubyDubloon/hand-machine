// The timer alarm (Isaac's change, 26 Nov 2026): when a recipe timer is up, a chime rings, over and over, until you
// stop it. It rings on any screen (it sits above them all) and even with the ring switch on silent, and a bar at the
// top says which timer it is, with Stop. Stop clears the timers that are ringing. A timer done more than an hour
// ago is quiet when the app next opens (RING_FOR_MS). With the app closed or the phone locked, the notification
// plays a 28-second version of the chime instead (iOS plays a notification's sound once, for at most 30 seconds).
import { setAudioModeAsync, useAudioPlayer } from "expo-audio"
import { BellRing } from "lucide-react-native"
import * as React from "react"
import { AccessibilityInfo, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { FullWindowOverlay } from "react-native-screens"
import { useStore } from "../data/store"
import { useNow, useTimers } from "../data/timers"
import { ringing } from "../logic/timers"
import { Press } from "./kit"
import { font, radius, useColours } from "./theme"

const CHIME = require("../../assets/sounds/chime.wav")

export function TimerAlarm() {
  const { state } = useStore()
  const { stop } = useTimers()
  const { focus } = useColours()
  const insets = useSafeAreaInsets()
  const player = useAudioPlayer(CHIME)
  const now = useNow((state.timers ?? []).length > 0)
  const up = ringing(state, now)
  const on = up.length > 0
  const first = up[0]

  React.useEffect(() => {
    if (!on) {
      player.pause()
      return
    }
    let gone = false
    void setAudioModeAsync({ playsInSilentMode: true, interruptionMode: "duckOthers" }).catch(() => {}).then(() => {
      if (gone) return
      player.loop = true
      void player.seekTo(0)
      player.play()
    })
    return () => {
      gone = true
    }
  }, [on, player])

  React.useEffect(() => {
    if (first) AccessibilityInfo.announceForAccessibility(`${first.label} timer is up`)
  }, [first?.id])

  if (!first) return null
  const more = up.length - 1
  // In its own window over everything, so it shows over full-screen views like Cooking too.
  return (
    <FullWindowOverlay>
    <View pointerEvents="box-none" style={{ position: "absolute", left: 12, right: 12, top: insets.top + 6 }}>
      <View accessibilityRole="alert" style={{ backgroundColor: focus.bg, borderRadius: radius.dialog, borderWidth: 2, borderColor: focus.gold, paddingVertical: 10, paddingLeft: 14, paddingRight: 8, flexDirection: "row", alignItems: "center", gap: 12, shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8 }}>
        <BellRing size={22} color={focus.gold} strokeWidth={2} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: font.semibold, fontSize: 16, color: focus.ink }}>{first.label} is up{more ? ` (+${more} more)` : ""}</Text>
          <Text numberOfLines={1} style={{ fontFamily: font.regular, fontSize: 14, color: focus.label }}>{first.recipeName}, step {first.step + 1}</Text>
        </View>
        <Press
          onPress={() => up.forEach(stop)}
          tint={focus.press}
          accessibilityLabel={up.length > 1 ? `Stop the ${up.length} timers` : `Stop the ${first.label} timer`}
          style={{ minHeight: 44, paddingHorizontal: 18, borderRadius: radius.base, backgroundColor: focus.gold, alignItems: "center", justifyContent: "center" }}
        >
          <Text style={{ fontFamily: font.semibold, fontSize: 15, letterSpacing: 0.9, textTransform: "uppercase", color: focus.onGold }}>Stop</Text>
        </Press>
      </View>
    </View>
    </FullWindowOverlay>
  )
}

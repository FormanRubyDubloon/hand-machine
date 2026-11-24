// Recipe timers on the phone (Batch 6, 24 Nov 2026). Timers live in the phone's state (not synced) by when they end;
// each one schedules a local notification, so it alerts when it's up even with the phone locked or the app closed.
// The first timer asks for permission to send notifications. Turned down, timers still count down in the app.
import * as Notifications from "expo-notifications"
import * as React from "react"
import { Platform } from "react-native"
import { newTimer, type StepTime, type Timer } from "../logic/timers"
import { useStore } from "./store"

// A timer that's up while the app is open still shows its alert and plays its sound.
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldPlaySound: true, shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true }),
})

/** Asks once for permission to alert. Returns whether alerts will show. */
async function canAlert(): Promise<boolean> {
  if (Platform.OS === "web") return false
  const now = await Notifications.getPermissionsAsync()
  if (now.granted) return true
  if (!now.canAskAgain) return false
  return (await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true } })).granted
}

/**
 * The time now, re-rendering every second while there's something to count down. It reads the clock on every render:
 * a time kept from when the screen opened made a new timer start 10 seconds long if the page had been open 10 seconds.
 */
export function useNow(active: boolean) {
  const [, tick] = React.useState(0)
  React.useEffect(() => {
    if (!active) return
    const t = setInterval(() => tick((n) => n + 1), 1000)
    return () => clearInterval(t)
  }, [active])
  return Date.now()
}

export function useTimers() {
  const { state, local } = useStore()
  const [alertsOff, setAlertsOff] = React.useState(false)

  const start = React.useCallback(async (recipe: { id: string; name: string }, step: number, time: StepTime) => {
    const timer = newTimer(recipe, step, time)
    local((s) => ({ ...s, timers: [...(s.timers ?? []), timer] }))
    if (!(await canAlert().catch(() => false))) return setAlertsOff(true)
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: { title: `${time.label} is up`, body: `${recipe.name}, step ${step + 1}`, sound: true },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: time.seconds },
    }).catch(() => undefined)
    if (notificationId) local((s) => ({ ...s, timers: (s.timers ?? []).map((t) => (t.id === timer.id ? { ...t, notificationId } : t)) }))
  }, [local])

  /** Stops a running timer, or clears one that's done. */
  const stop = React.useCallback((t: Timer) => {
    if (t.notificationId) void Notifications.cancelScheduledNotificationAsync(t.notificationId).catch(() => {})
    local((s) => ({ ...s, timers: (s.timers ?? []).filter((x) => x.id !== t.id) }))
  }, [local])

  return { timers: state.timers ?? [], start, stop, alertsOff }
}

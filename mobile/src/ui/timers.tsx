// Timer controls for recipe steps (Batch 6, 24 Nov 2026). StepTimers sits under a step: one button per time the step
// names, which starts a timer, shows its countdown while it runs (tap to stop), and says it's done until you clear it.
// TimerStrip lists every timer that's running or done, from any step or recipe, so several can be watched at once.
import { Timer as TimerIcon, X } from "lucide-react-native"
import * as React from "react"
import { Text, View } from "react-native"
import { useStore } from "../data/store"
import { useNow, useTimers } from "../data/timers"
import { clock, secondsLeft, timerFor, timersBySoonest, timesIn, type Timer } from "../logic/timers"
import { Caption, Press } from "./kit"
import { font, radius, useColours } from "./theme"

/** Colours for the cooking view (always dark) or a plain page. */
function usePalette(dark?: boolean) {
  const c = useColours()
  const { focus } = c
  return dark
    ? { ink: focus.ink, sub: focus.label, line: focus.gold, fill: focus.gold, onFill: focus.onGold, panel: focus.field }
    : { ink: c.ink, sub: c.muted, line: c.primary, fill: c.primary, onFill: c.onPrimary, panel: c.panel }
}

export function StepTimers({ recipe, step, text, dark }: { recipe: { id: string; name: string }; step: number; text: string; dark?: boolean }) {
  const { state } = useStore()
  const { start, stop, alertsOff } = useTimers()
  const p = usePalette(dark)
  const times = timesIn(text)
  const running = times.some((t) => !!timerFor(state, recipe.id, step, t.seconds))
  const now = useNow(running)
  if (!times.length) return null
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {times.map((time) => {
          const t = timerFor(state, recipe.id, step, time.seconds)
          const left = t ? secondsLeft(t, now) : 0
          const done = !!t && left === 0
          const label = !t ? `${time.label} timer` : done ? `${time.label} done` : clock(left)
          return (
            <Press
              key={time.seconds}
              onPress={() => (t ? stop(t) : void start(recipe, step, time))}
              accessibilityRole="button"
              accessibilityLabel={!t ? `Start a ${time.label} timer` : done ? `${time.label} timer done. Clear it` : `${time.label} timer, ${clock(left)} left. Stop it`}
              style={{
                minHeight: 44, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1.5, borderColor: p.line,
                backgroundColor: done ? p.fill : t ? p.panel : "transparent", flexDirection: "row", alignItems: "center", gap: 8,
              }}
            >
              {t && !done ? <X size={18} color={p.ink} strokeWidth={2.25} /> : <TimerIcon size={18} color={done ? p.onFill : p.ink} strokeWidth={2} />}
              <Text style={{ fontFamily: font.semibold, fontSize: 16, color: done ? p.onFill : p.ink, fontVariant: ["tabular-nums"] }}>{label}</Text>
            </Press>
          )
        })}
      </View>
      {alertsOff && <Caption style={{ color: p.sub }}>Alerts are off, so a timer only shows here. Turn on notifications for Collca in the iPhone's Settings.</Caption>}
    </View>
  )
}

/** "2. Melt the butter in the pan…": the step's number and its text, or the recipe's name if the step has gone. */
export const stepLine = (t: Timer, recipes: { id: string; method: string[] }[]) => {
  const text = recipes.find((r) => r.id === t.recipeId)?.method[t.step]
  return text ? `${t.step + 1}. ${text}` : `${t.recipeName}, step ${t.step + 1}`
}

/** Every timer that's running or done, soonest first. Hidden when there are none (or only `except`'s). */
export function TimerStrip({ dark, except }: { dark?: boolean; except?: (t: Timer) => boolean }) {
  const { state } = useStore()
  const { stop } = useTimers()
  const p = usePalette(dark)
  const timers = timersBySoonest(state).filter((t) => !except?.(t))
  const now = useNow(timers.length > 0)
  if (!timers.length) return null
  return (
    <View style={{ gap: 6 }}>
      {timers.map((t) => {
        const left = secondsLeft(t, now)
        const done = left === 0
        return (
          <View key={t.id} style={{ minHeight: 48, borderRadius: radius.base, backgroundColor: done ? p.fill : p.panel, paddingLeft: 14, flexDirection: "row", alignItems: "center", gap: 10 }}>
            <TimerIcon size={18} color={done ? p.onFill : p.ink} />
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={{ fontFamily: font.semibold, fontSize: 15, color: done ? p.onFill : p.ink }}>{done ? `${t.label} is up` : clock(left)}</Text>
              {/* The step's number and the start of its text, cut to one line (Isaac's change, 24 Nov 2026). */}
              <Text numberOfLines={1} ellipsizeMode="tail" style={{ fontFamily: font.regular, fontSize: 13, color: done ? p.onFill : p.sub }}>{stepLine(t, state.recipes)}</Text>
            </View>
            <Press fade onPress={() => stop(t)} accessibilityLabel={done ? `Clear the ${t.label} timer` : `Stop the ${t.label} timer`} style={{ minHeight: 48, minWidth: 48, alignItems: "center", justifyContent: "center" }}>
              <X size={20} color={done ? p.onFill : p.ink} />
            </Press>
          </View>
        )
      })}
    </View>
  )
}

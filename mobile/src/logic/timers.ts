// Recipe timers (Batch 6, 24 Nov 2026): any step that names a time gets a timer, and several can run at once. A
// timer is kept by when it ends, so it carries on while the app is closed; a local notification alerts when it's up,
// even with the phone locked. Pure, so it's tested (test/timers.test.ts).
import type { PhoneState } from "../data/state"

export type Timer = {
  id: string
  recipeId: string
  recipeName: string
  /** The step it's for, from 0. */
  step: number
  /** As the step says it: "25 min", "1 hr 30 min". */
  label: string
  seconds: number
  /** ISO time it ends. */
  endsAt: string
  /** The scheduled local notification, to cancel with the timer. */
  notificationId?: string
}

export type StepTime = { label: string; seconds: number }

const WORDS: Record<string, number> = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, fifteen: 15, twenty: 20, thirty: 30, forty: 40, "forty-five": 45, sixty: 60 }
const UNIT: Record<string, number> = { hour: 3600, hours: 3600, hr: 3600, hrs: 3600, minute: 60, minutes: 60, min: 60, mins: 60, second: 1, seconds: 1, sec: 1, secs: 1 }

/** "1", "1.5", "1½", "1 1/2", "½", "a", "two" → a number. */
function amount(s: string): number | null {
  const t = s.trim().toLowerCase()
  if (t in WORDS) return WORDS[t]
  const half = t.match(/^(\d+)?\s*(½|1\/2)$/)
  if (half) return Number(half[1] ?? 0) + 0.5
  const quarter = t.match(/^(\d+)?\s*(¼|1\/4|¾|3\/4)$/)
  if (quarter) return Number(quarter[1] ?? 0) + (/¾|3\/4/.test(quarter[2]) ? 0.75 : 0.25)
  const n = Number(t)
  return Number.isFinite(n) && n > 0 ? n : null
}

/** 1500 → "25 min", 5400 → "1 hr 30 min", 45 → "45 sec". */
export function durationText(seconds: number) {
  if (seconds < 60) return `${seconds} sec`
  const h = Math.floor(seconds / 3600)
  const m = Math.round((seconds % 3600) / 60)
  return [h ? `${h} hr` : "", m ? `${m} min` : ""].filter(Boolean).join(" ")
}

const NUM = String.raw`(?:\d+(?:\.\d+)?(?:\s*(?:½|¼|¾|1/2|1/4|3/4))?|½|¼|¾|a|an|one|two|three|four|five|six|seven|eight|nine|ten|fifteen|twenty|thirty|forty|forty-five|sixty)`
// "half an hour" and "half a minute" carry their own unit, so they're matched whole, before a plain "an hour".
const TIME = new RegExp(String.raw`\b(?:(half an hour|half a minute)|(${NUM})(?:\s*(?:-|–|to)\s*${NUM})?\s*(hours?|hrs?|minutes?|mins?|seconds?|secs?))\b`, "gi")

/**
 * The times a step names, in order, once each: "Simmer for 25 minutes" → 25 min. A range ("8–10 minutes") gives the
 * shorter time, so you check early rather than late. "half an hour" is 30 minutes.
 */
export function timesIn(step: string): StepTime[] {
  const out: StepTime[] = []
  for (const m of step.matchAll(TIME)) {
    const [, half, first, unitWord] = m
    let seconds: number | null
    if (half) seconds = half.toLowerCase() === "half an hour" ? 1800 : 30
    else {
      const n = amount(first)
      seconds = n === null ? null : Math.round(n * UNIT[unitWord.toLowerCase()])
    }
    if (!seconds || seconds < 5 || seconds > 24 * 3600) continue
    if (out.some((t) => t.seconds === seconds)) continue
    out.push({ label: durationText(seconds), seconds })
  }
  return out
}

/** Seconds left on a timer at `now`, never below 0. */
export const secondsLeft = (t: Timer, now: number) => Math.max(0, Math.ceil((Date.parse(t.endsAt) - now) / 1000))

/** "24:59", "1:02:03". */
export function clock(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const two = (n: number) => String(n).padStart(2, "0")
  return h ? `${h}:${two(m)}:${two(s)}` : `${m}:${two(s)}`
}

/** A new timer for a step's time. */
export function newTimer(recipe: { id: string; name: string }, step: number, time: StepTime, now = Date.now()): Timer {
  return {
    id: `t-${now.toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    recipeId: recipe.id, recipeName: recipe.name, step, label: time.label, seconds: time.seconds,
    endsAt: new Date(now + time.seconds * 1000).toISOString(),
  }
}

/** The running (or finished, not yet dismissed) timer for a step's time, if there is one. */
export const timerFor = (state: Pick<PhoneState, "timers">, recipeId: string, step: number, seconds: number) =>
  (state.timers ?? []).find((t) => t.recipeId === recipeId && t.step === step && t.seconds === seconds)

/** Timers, soonest to end first. */
export const timersBySoonest = (state: Pick<PhoneState, "timers">) => [...(state.timers ?? [])].sort((a, b) => a.endsAt.localeCompare(b.endsAt))

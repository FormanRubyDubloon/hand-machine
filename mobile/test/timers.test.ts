// Batch 6 (24 Nov 2026): finding the times in a recipe step, and the timers made from them.
import { describe, expect, it } from "vitest"
import { clock, durationText, newTimer, RING_FOR_MS, ringing, secondsLeft, timesIn } from "../src/logic/timers"

describe("times in a step", () => {
  it("finds minutes, hours and seconds as a step says them", () => {
    expect(timesIn("Rinse the rice and simmer it for 25 minutes, then drain.")).toEqual([{ label: "25 min", seconds: 1500 }])
    expect(timesIn("Roast for 1 hour")).toEqual([{ label: "1 hr", seconds: 3600 }])
    expect(timesIn("Bake for 1½ hours")[0].seconds).toBe(5400)
    expect(timesIn("Bake for 1 1/2 hours")[0].label).toBe("1 hr 30 min")
    expect(timesIn("Whisk for 30 seconds")[0].label).toBe("30 sec")
    expect(timesIn("Rest for 10 mins")[0].seconds).toBe(600)
  })

  it("takes the shorter end of a range, and reads words", () => {
    expect(timesIn("Cook for 8–10 minutes until golden")[0]).toEqual({ label: "8 min", seconds: 480 })
    expect(timesIn("Simmer for 2 to 3 hours")[0].seconds).toBe(7200)
    expect(timesIn("Leave for half an hour")[0].seconds).toBe(1800)
    expect(timesIn("Cook for a minute, then two minutes more")).toEqual([{ label: "1 min", seconds: 60 }, { label: "2 min", seconds: 120 }])
  })

  it("finds each time once, and ignores what isn't a time", () => {
    expect(timesIn("Fry for 5 minutes, stir, then fry for 5 minutes more")).toHaveLength(1)
    expect(timesIn("Add 400 g tomatoes and 2 tsp salt")).toEqual([])
    expect(timesIn("Roast at 200°C")).toEqual([])
    expect(timesIn("Serves 4")).toEqual([])
  })
})

describe("a timer", () => {
  it("counts down from when it ends", () => {
    const now = Date.parse("2026-11-24T12:00:00Z")
    const t = newTimer({ id: "rice", name: "Rice" }, 0, { label: "25 min", seconds: 1500 }, now)
    expect(t.endsAt).toBe("2026-11-24T12:25:00.000Z")
    expect(secondsLeft(t, now + 60_000)).toBe(1440)
    expect(secondsLeft(t, now + 2_000_000)).toBe(0)
    expect(clock(1440)).toBe("24:00")
    expect(clock(3723)).toBe("1:02:03")
    expect(durationText(5400)).toBe("1 hr 30 min")
  })
})

describe("the demo's 20-second step", () => {
  it("is 20 seconds, and a new timer for it has 20 left", () => {
    const [t] = timesIn("Stir in the berries and let them warm through for 20 seconds.")
    expect(t).toEqual({ label: "20 sec", seconds: 20 })
    expect(secondsLeft(newTimer({ id: "p", name: "P" }, 2, t), Date.now())).toBe(20)
  })
})

describe("ringing", () => {
  it("rings for done timers until they're cleared, but not for ones done over an hour ago", () => {
    const now = Date.parse("2026-11-26T18:00:00Z")
    const t = (id: string, msAgo: number) => ({ ...newTimer({ id: "r", name: "R" }, 0, { label: "1 min", seconds: 60 }, now), id, endsAt: new Date(now - msAgo).toISOString() })
    const state = { timers: [t("running", -30_000), t("done", 5_000), t("old", RING_FOR_MS + 1)] }
    expect(ringing(state, now).map((x) => x.id)).toEqual(["done"])
    expect(ringing({ timers: [] }, now)).toEqual([])
  })
})

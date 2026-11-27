// Insights (27 Nov 2026, claude/insights-plan.md): the sums behind Home's Insights view, from the facts on History
// entries. Pure (no React, no browser), so it's tested in Node (claude-connection/test/insights.test.ts).
import { tagsOf, unitWord, type Fact, type Item, type Items, type Who } from "./model"

/** A History entry, as far as Insights needs it. */
export type FactRow = { id: string; at: string; who?: Who; undone?: boolean; facts?: Fact[] | null }

export type Period = "week" | "month" | "year"

const DAY = 86_400_000

/** Midnight at the start of this week (Monday), month or year. */
export function periodStart(p: Period, now = new Date()): Date {
  if (p === "year") return new Date(now.getFullYear(), 0, 1)
  if (p === "month") return new Date(now.getFullYear(), now.getMonth(), 1)
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d
}

/** The period before: last week, last month, last year. */
export function previousStart(p: Period, now = new Date()): Date {
  const s = periodStart(p, now)
  if (p === "year") return new Date(s.getFullYear() - 1, 0, 1)
  if (p === "month") return new Date(s.getFullYear(), s.getMonth() - 1, 1)
  return new Date(s.getTime() - 7 * DAY)
}

type Dated<F> = F & { at: string }
type Bought = Dated<Extract<Fact, { kind: "bought" }>>
type Threw = Dated<Extract<Fact, { kind: "threw" }>>

export type Insights = {
  /** When the first fact is: before then there's nothing to show. */
  since: string | null
  spent: { pence: number; before: number; estimated: boolean; unpriced: number }
  shops: { count: number; average: number; mostAt: string | null }
  cooked: { meals: number; recipes: number; first: number }
  thrown: { pence: number; qty: number; share: number; list: { itemId: string; qty: number; pence?: number; at: string }[] }
  /** Spend for each of the last eight weeks, oldest first; the last is this week. */
  weeks: { start: string; pence: number }[]
  weekAverage: number
  /** Spend by an item's first tag, biggest first; null is no tag (or a deleted item). */
  byTag: { tagId: string | null; pence: number }[]
  usedMost: { itemId: string; qty: number }[]
  pace: { itemId: string; text: string }[]
}

/** All the facts from entries that aren't undone, each with its entry's time. */
export function factsIn(rows: FactRow[]): Dated<Fact>[] {
  return rows.filter((r) => !r.undone && r.facts?.length).flatMap((r) => r.facts!.map((f) => ({ ...f, at: r.at })))
}

const between = (at: string, from: Date, to?: Date) => {
  const t = Date.parse(at)
  return t >= from.getTime() && (!to || t < to.getTime())
}
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)

/**
 * "About 1 a day", "5 a week", "1 litre every 2 days", "A bag every 5 weeks". `perDay` is units a day. Bulk items
 * and items with a unit say it ("1 litre", "A bag").
 */
export function paceText(item: Item, perDay: number): string {
  const one = unitWord(item, 1)
  const a = one ? `${/^[aeiou]/i.test(one) ? "An" : "A"} ${one}` : "One"
  if (perDay >= 0.85) return `About ${Math.round(perDay)} a day`
  if (perDay * 7 >= 1.5) return `${Math.round(perDay * 7)} a week`
  const days = 1 / perDay
  if (days < 1.5) return `About 1 a day`
  if (days <= 13) return `${a} every ${Math.round(days)} days`
  return `${a} every ${Math.round(days / 7)} weeks`
}

/** At least this many uses before an item's pace is shown. */
export const PACE_MIN_USES = 3

export function insights(rows: FactRow[], items: Items, period: Period, now = new Date()): Insights {
  const all = factsIn(rows)
  const from = periodStart(period, now)
  const before = previousStart(period, now)
  const inPeriod = all.filter((f) => between(f.at, from))
  const bought = inPeriod.filter((f): f is Bought => f.kind === "bought")
  const threw = inPeriod.filter((f): f is Threw => f.kind === "threw")
  const spend = (fs: Bought[]) => sum(fs.map((f) => f.pence ?? 0))

  // Shops: the phone's tick-offs grouped by shop; the store is where most of its ticks were.
  const shops = new Map<string, { pence: number; stores: Map<string, number> }>()
  for (const f of bought) {
    if (!f.shopId) continue
    const s = shops.get(f.shopId) ?? { pence: 0, stores: new Map() }
    s.pence += f.pence ?? 0
    if (f.storeId) s.stores.set(f.storeId, (s.stores.get(f.storeId) ?? 0) + 1)
    shops.set(f.shopId, s)
  }
  const storeShops = new Map<string, number>()
  for (const s of shops.values()) {
    const top = [...s.stores].sort((a, b) => b[1] - a[1])[0]?.[0]
    if (top) storeShops.set(top, (storeShops.get(top) ?? 0) + 1)
  }

  // Cooked: meals, different recipes, and recipes cooked for the first time (as far as the facts go back).
  const cooked = all.filter((f): f is Dated<Extract<Fact, { kind: "cooked" }>> => f.kind === "cooked")
  const firstCooked = new Map<string, string>()
  for (const f of cooked) if (!firstCooked.has(f.recipeId) || f.at < firstCooked.get(f.recipeId)!) firstCooked.set(f.recipeId, f.at)
  const cookedNow = cooked.filter((f) => between(f.at, from))
  const recipesNow = new Set(cookedNow.map((f) => f.recipeId))

  // The last eight weeks, this one last.
  const thisWeek = periodStart("week", now)
  const weeks = Array.from({ length: 8 }, (_, n) => {
    const start = new Date(thisWeek.getTime() - (7 - n) * 7 * DAY)
    const end = new Date(start.getTime() + 7 * DAY)
    return { start: start.toISOString(), pence: spend(all.filter((f): f is Bought => f.kind === "bought" && between(f.at, start, end))) }
  })
  const firstAt = all.length ? all.reduce((a, f) => (f.at < a ? f.at : a), all[0].at) : null
  // The average leaves out weeks before the first fact, so a new account isn't averaged with empty weeks.
  const counted = weeks.filter((w) => firstAt && Date.parse(w.start) + 7 * DAY > Date.parse(firstAt))
  const weekAverage = counted.length ? Math.round(sum(counted.map((w) => w.pence)) / counted.length) : 0

  const byTag = new Map<string | null, number>()
  for (const f of bought) {
    const tag = items[f.itemId] ? (tagsOf(items[f.itemId])[0] ?? null) : null
    byTag.set(tag, (byTag.get(tag) ?? 0) + (f.pence ?? 0))
  }

  const used = new Map<string, number>()
  for (const f of inPeriod) if (f.kind === "used") used.set(f.itemId, (used.get(f.itemId) ?? 0) + f.qty)

  // Pace: over the last 90 days, from the first use to now, for items used at least PACE_MIN_USES times.
  const recent = all.filter((f): f is Dated<Extract<Fact, { kind: "used" }>> => f.kind === "used" && between(f.at, new Date(now.getTime() - 90 * DAY)))
  const uses = new Map<string, { n: number; qty: number; first: string }>()
  for (const f of recent) {
    const u = uses.get(f.itemId) ?? { n: 0, qty: 0, first: f.at }
    uses.set(f.itemId, { n: u.n + 1, qty: u.qty + f.qty, first: f.at < u.first ? f.at : u.first })
  }
  const pace = [...uses]
    .filter(([id, u]) => items[id] && u.n >= PACE_MIN_USES)
    .sort((a, b) => b[1].n - a[1].n || items[a[0]].name.localeCompare(items[b[0]].name))
    .map(([id, u]) => ({ itemId: id, text: paceText(items[id], u.qty / Math.max(1, (now.getTime() - Date.parse(u.first)) / DAY)) }))

  const boughtPence = spend(bought)
  const thrownPence = sum(threw.map((f) => f.pence ?? 0))
  return {
    since: firstAt,
    spent: {
      pence: boughtPence,
      before: spend(all.filter((f): f is Bought => f.kind === "bought" && between(f.at, before, from))),
      estimated: bought.some((f) => f.estimate),
      unpriced: bought.filter((f) => f.pence === undefined && f.qty > 0).length,
    },
    shops: { count: shops.size, average: shops.size ? Math.round(sum([...shops.values()].map((s) => s.pence)) / shops.size) : 0, mostAt: [...storeShops].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null },
    cooked: { meals: cookedNow.length, recipes: recipesNow.size, first: [...recipesNow].filter((id) => between(firstCooked.get(id)!, from)).length },
    thrown: {
      pence: thrownPence,
      qty: sum(threw.map((f) => f.qty)),
      share: boughtPence > 0 ? thrownPence / boughtPence : 0,
      list: threw.map((f) => ({ itemId: f.itemId, qty: f.qty, pence: f.pence, at: f.at })).sort((a, b) => b.at.localeCompare(a.at)),
    },
    weeks,
    weekAverage,
    byTag: [...byTag].map(([tagId, pence]) => ({ tagId, pence })).filter((t) => t.pence > 0).sort((a, b) => b.pence - a.pence),
    usedMost: [...used].map(([itemId, qty]) => ({ itemId, qty })).filter((u) => u.qty > 0).sort((a, b) => b.qty - a.qty).slice(0, 5),
    pace: pace.slice(0, 4),
  }
}

// Insights on Home (27 Nov 2026, Isaac's "How November's going" mock-up): spend, shops, cooking and waste for this
// week, month or year, from the facts on History entries (insights-model.ts). The apps keep only the newest 500
// History entries, so this reads every entry with facts from Supabase, plus any here not yet synced.
import * as React from "react"
import { fetchFacts } from "../../shared/src/pantry-remote"
import { cn } from "@/lib/utils"
import { money, plural } from "./model"
import { insights, periodStart, previousStart, type FactRow, type Period } from "./insights-model"
import { usePantry } from "./state"
import { Eyebrow } from "./components"
import { navigate } from "./router"

const monthName = (d: Date) => d.toLocaleDateString("en-GB", { month: "long" })
export const periodLabel = (p: Period, now = new Date()) => (p === "week" ? "This week" : p === "month" ? monthName(now) : "This year")
/** "How November's going", "How this week's going". */
export const insightsTitle = (p: Period, now = new Date()) => (p === "week" ? "How this week's going" : p === "month" ? `How ${monthName(now)}'s going` : `How ${now.getFullYear()}'s going`)
const before = (p: Period, now = new Date()) => (p === "week" ? "last week" : p === "month" ? monthName(previousStart("month", now)) : "last year")
const shortDay = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" })

/** £186 for whole pounds over £100, £4.20 under. */
const pounds = (pence: number) => (Math.abs(pence) >= 10000 ? `£${Math.round(pence / 100)}` : money(pence))

/** Every entry with facts: Supabase's, then this browser's own (newer, perhaps not yet synced) by id. */
function useFactRows() {
  const { db } = usePantry()
  const [remote, setRemote] = React.useState<FactRow[] | null>(null)
  const [error, setError] = React.useState<string>()
  React.useEffect(() => {
    let live = true
    fetchFacts("2000-01-01")
      .then((rows) => live && setRemote(rows.map((r) => ({ ...r, facts: Array.isArray(r.facts) ? (r.facts as FactRow["facts"]) : null }))))
      .catch((e: Error) => live && setError(e.message))
    return () => { live = false }
  }, [])
  return React.useMemo(() => {
    const byId = new Map<string, FactRow>((remote ?? []).map((r) => [r.id, r]))
    for (const h of db.history) if (h.facts?.length) byId.set(h.id, h)
    return { rows: [...byId.values()], loading: remote === null && !error, error }
  }, [remote, db.history, error])
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card/40 px-8 py-7">
      <Eyebrow className="text-[12px] text-foreground">{label}</Eyebrow>
      <span className="font-serif text-[52px] leading-none font-bold">{value}</span>
      <span className="text-[15px] text-muted-foreground">{sub}</span>
    </div>
  )
}

function Card({ title, aside, className, children }: { title: string; aside?: React.ReactNode; className?: string; children: React.ReactNode }) {
  return (
    <section className={cn("flex flex-col gap-6 rounded-lg border border-border bg-card/40 px-8 py-7", className)}>
      <div className="flex items-baseline justify-between gap-4">
        <h2><Eyebrow className="text-[12px] text-foreground">{title}</Eyebrow></h2>
        {aside}
      </div>
      {children}
    </section>
  )
}

/** Eight weeks of spend, this week in the second colour, with a dashed line at the average. Each bar is labelled. */
function WeeklySpend({ weeks, average }: { weeks: { start: string; pence: number }[]; average: number }) {
  const max = Math.max(average, ...weeks.map((w) => w.pence), 1)
  const H = 220
  return (
    <figure className="flex flex-col gap-2">
      <div className="relative flex items-end gap-6 border-b border-border" style={{ height: H + 28 }}>
        {average > 0 && (
          <div className="pointer-events-none absolute inset-x-0 border-t border-dashed border-muted-foreground/60" style={{ bottom: (average / max) * H }}>
            <span className="absolute right-0 -top-5 bg-background/0 text-[13px] text-muted-foreground">{pounds(average)} average</span>
          </div>
        )}
        {weeks.map((w, n) => {
          const now = n === weeks.length - 1
          const label = now ? "This week" : shortDay(w.start)
          return (
            <div key={w.start} className="group relative flex flex-1 flex-col items-center justify-end gap-1.5" title={`${label}: ${pounds(w.pence)}`}>
              <span className="text-[13px] font-semibold tabular-nums">{w.pence ? pounds(w.pence) : ""}</span>
              <div
                className={cn("w-full max-w-[72px] rounded-t-[4px] group-hover:opacity-85", now ? "bg-(--spend-2)" : "bg-(--spend-1)")}
                style={{ height: Math.max(w.pence ? 2 : 0, (w.pence / max) * H) }}
              />
            </div>
          )
        })}
      </div>
      <div className="flex gap-6">
        {weeks.map((w, n) => (
          <span key={w.start} className="flex-1 text-center text-[13px] text-muted-foreground">{n === weeks.length - 1 ? "This week" : shortDay(w.start)}</span>
        ))}
      </div>
      <figcaption className="sr-only">
        Weekly spend: {weeks.map((w, n) => `${n === weeks.length - 1 ? "this week" : `week of ${shortDay(w.start)}`} ${pounds(w.pence)}`).join(", ")}. Average {pounds(average)}.
      </figcaption>
    </figure>
  )
}

const SLOTS = ["bg-(--spend-1)", "bg-(--spend-2)", "bg-(--spend-3)", "bg-(--spend-4)"]

/** Spend by tag: the four biggest, then Everything else, as one bar and a legend with the amounts. */
function WhereItWent({ byTag }: { byTag: { tagId: string | null; pence: number }[] }) {
  const { db } = usePantry()
  const named = byTag.filter((t) => t.tagId).slice(0, 4)
  const rest = byTag.filter((t) => !named.includes(t)).reduce((a, t) => a + t.pence, 0)
  const rows = [
    ...named.map((t, n) => ({ key: t.tagId!, name: db.categories.find((c) => c.id === t.tagId)?.name ?? "A removed tag", pence: t.pence, fill: SLOTS[n] })),
    ...(rest > 0 ? [{ key: "rest", name: "Everything else", pence: rest, fill: "bg-(--spend-rest)" }] : []),
  ]
  const total = rows.reduce((a, r) => a + r.pence, 0)
  if (!total) return <p className="text-sm text-muted-foreground">Nothing bought yet in this period.</p>
  return (
    <div className="flex flex-col gap-5">
      <div className="flex h-4 gap-0.5 overflow-hidden rounded-full" aria-hidden="true">
        {rows.map((r) => <div key={r.key} className={r.fill} style={{ width: `${(r.pence / total) * 100}%` }} title={`${r.name}: ${pounds(r.pence)}`} />)}
      </div>
      <ul className="flex flex-col gap-2.5">
        {rows.map((r) => (
          <li key={r.key} className="flex items-center gap-3 text-[17px]">
            <span className={cn("size-3.5 shrink-0 rounded-[3px]", r.fill)} aria-hidden="true" />
            <span className="flex-1">{r.name}</span>
            <span className="font-semibold tabular-nums">{pounds(r.pence)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function Insights({ period }: { period: Period }) {
  const { items, db } = usePantry()
  const { rows, loading, error } = useFactRows()
  const now = new Date()
  const i = React.useMemo(() => insights(rows, items, period, now), [rows, items, period]) // eslint-disable-line react-hooks/exhaustive-deps
  const nameOf = (id: string) => items[id]?.name ?? "A removed item"
  const store = (id: string | null) => db.stores.find((s) => s.id === id)?.name

  if (loading) return <p className="text-sm text-muted-foreground">Adding it up…</p>
  if (error) return <p className="text-sm text-muted-foreground">Couldn't load Insights: {error}</p>
  if (!i.since) {
    return (
      <section className="flex max-w-[720px] flex-col gap-3 rounded-lg border border-border p-10">
        <h2><Eyebrow className="text-[13px] text-foreground">Nothing counted yet</Eyebrow></h2>
        <p className="text-lg leading-snug">
          Insights counts what you tick off on the phone, use, cook and throw out, from today. Come back after your next shop.
        </p>
      </section>
    )
  }

  const diff = i.spent.pence - i.spent.before
  const spentSub = !i.spent.before
    ? i.spent.unpriced ? `${plural(i.spent.unpriced, "thing")} without a price` : `Nothing counted for ${before(period)}`
    : diff === 0 ? `The same as ${before(period)}` : `${pounds(Math.abs(diff))} ${diff < 0 ? "less" : "more"} than ${before(period)}`
  const since = Date.parse(i.since) > periodStart(period, now).getTime() ? `Counting since ${shortDay(i.since)}.` : null

  return (
    <div className="flex flex-col gap-8">
      {since && <p className="-mt-4 text-[15px] text-muted-foreground">{since} Spend starts from the first shop ticked off after that.</p>}
      <div className="grid grid-cols-4 gap-6">
        <Stat label="Spent on food" value={pounds(i.spent.pence)} sub={spentSub} />
        <Stat label="Shops" value={String(i.shops.count)} sub={[i.shops.count ? `${pounds(i.shops.average)} on average` : "None ticked off on the phone", store(i.shops.mostAt) && `most at ${store(i.shops.mostAt)}`].filter(Boolean).join(" · ")} />
        <Stat label="Cooked at home" value={String(i.cooked.meals)} sub={`${i.cooked.meals === 1 ? "meal" : "meals"} from ${plural(i.cooked.recipes, "recipe")}${i.cooked.first ? ` · ${i.cooked.first} new` : ""}`} />
        <Stat label="Thrown out" value={pounds(i.thrown.pence)} sub={`${plural(i.thrown.qty, "thing")}${i.spent.pence ? ` · ${Math.round(i.thrown.share * 100)}% of what you bought` : ""}`} />
      </div>

      <div className="grid grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)] gap-6">
        <Card title="Weekly spend, last 8 weeks" aside={i.spent.estimated ? <span className="text-[15px] text-muted-foreground">Some prices are estimates</span> : null}>
          <WeeklySpend weeks={i.weeks} average={i.weekAverage} />
        </Card>
        <Card title="Where the money went">
          <WhereItWent byTag={i.byTag} />
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <Card title="Used most">
          {i.usedMost.length ? (
            <ul className="flex flex-col gap-2.5">
              {i.usedMost.map((u) => (
                <li key={u.itemId} className="grid grid-cols-[120px_1fr_32px] items-center gap-4 text-[17px]">
                  <button type="button" className="truncate text-left hover:underline" onClick={() => navigate({ name: "home", item: u.itemId })}>{nameOf(u.itemId)}</button>
                  <span className="h-2.5 rounded-full bg-(--spend-1)" style={{ width: `${(u.qty / i.usedMost[0].qty) * 100}%` }} aria-hidden="true" />
                  <span className="text-right tabular-nums">{u.qty}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted-foreground">Nothing used yet in this period.</p>}
        </Card>
        <Card title="How fast you use things">
          {i.pace.length ? (
            <ul className="flex flex-col">
              {i.pace.map((p) => (
                <li key={p.itemId} className="flex items-baseline justify-between gap-4 border-b border-border py-3 text-[17px] last:border-b-0">
                  <span className="font-semibold">{nameOf(p.itemId)}</span>
                  <span>{p.text}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted-foreground">An item shows here once it's been used three times.</p>}
        </Card>
        <Card title="Thrown out">
          {i.thrown.list.length ? (
            <ul className="flex flex-col">
              {i.thrown.list.slice(0, 5).map((t, n) => (
                <li key={n} className="flex items-baseline justify-between gap-4 border-b border-border py-3 text-[17px] last:border-b-0">
                  <span><span className="font-semibold">{nameOf(t.itemId)}</span> · {t.qty}</span>
                  <span className="text-muted-foreground">{[t.pence !== undefined ? pounds(t.pence) : null, new Date(t.at).toDateString() === now.toDateString() ? "today" : shortDay(t.at)].filter(Boolean).join(" · ")}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted-foreground">Nothing thrown out in this period.</p>}
        </Card>
      </div>
    </div>
  )
}

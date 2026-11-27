// Home (new design, 27 Nov 2026): Today and Insights. Today is a greeting, then four cards: Tonight (one recipe you
// can cook now, picked as the phone's Home picks it), Use it up (what goes off first), the next shop (hidden with
// nothing to buy) and Used one? Tap it (the most-used items, with −1). A bar under them says what's waiting to be
// reviewed. Insights needs a record of what was bought, which the app doesn't keep yet, so it says so.
// Search moved to the header (it was already there) and History to a panel off the header's clock.
import * as React from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { minutesText } from "../../../shared/src/pantry"
import {
  daysUntil, isBulk, isStaple, listRows, listTotal, locationLabel, lower, recipeInfo, soonest, stockOf, type Item, type Items, type Recipe,
} from "../model"
import { navigate } from "../router"
import { usePantry } from "../state"
import { Eyebrow, Segmented } from "../components"
import { ItemPanel } from "./item-panel"
import { RecipePanel } from "./recipe"
import { ReviewBar } from "../review"

type View = "today" | "insights"

// ---------- words ----------

const local = (date: string) => new Date(`${date}T00:00`)
const weekday = (date: string) => local(date).toLocaleDateString("en-GB", { weekday: "long" })

/** Good morning before 12:00, good afternoon from 12:00, good evening from 17:00 (as the phone). */
const greeting = (now = new Date()) => (now.getHours() < 12 ? "Good morning" : now.getHours() < 17 ? "Good afternoon" : "Good evening")
const dateLine = (now = new Date()) => now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }).replace(",", "")

/** "the spinach and chorizo", "the spinach, chorizo and 2 more". */
function namesText(items: Item[]) {
  const names = items.map((i) => lower(i.name))
  if (names.length <= 2) return `the ${names.join(" and ")}`
  return `the ${names.slice(0, 2).join(", ")} and ${names.length - 2} more`
}

/** Past its use-by or within two days of it, as the phone's Use soon. */
const goingOffSoon = (i: Item) => {
  const d = soonest(i)
  return !!d && daysUntil(d) <= 2
}

// ---------- Tonight ----------

type Pick = { recipe: Recipe; usesUp: { item: Item; date: string } | null }

/**
 * The recipes Tonight can offer, best first (the phone's tonightPicks): only those you can cook now; those that use
 * something going off first (soonest use-by first); then Want to cook; then the quickest; ties A to Z.
 */
function tonightPicks(recipes: Recipe[], items: Items): Pick[] {
  const picks: Pick[] = []
  for (const recipe of recipes) {
    const info = recipeInfo(recipe, items)
    if (!info.canCook) continue
    let usesUp: Pick["usesUp"] = null
    for (const r of info.rows) {
      if (!r.item || r.status === "short" || r.status === "listed" || !goingOffSoon(r.item)) continue
      const d = soonest(r.item)!
      if (!usesUp || d < usesUp.date) usesUp = { item: r.item, date: d }
    }
    picks.push({ recipe, usesUp })
  }
  const mins = (p: Pick) => (p.recipe.minutes > 0 ? p.recipe.minutes : Infinity)
  return picks.sort((a, b) =>
    (a.usesUp ? 0 : 1) - (b.usesUp ? 0 : 1) ||
    (a.usesUp && b.usesUp ? a.usesUp.date.localeCompare(b.usesUp.date) : 0) ||
    Number(!!b.recipe.wantToCook) - Number(!!a.recipe.wantToCook) ||
    mins(a) - mins(b) ||
    a.recipe.name.localeCompare(b.recipe.name),
  )
}

/** "35 min · serves 2 · you have everything, and it uses the chorizo before Sunday." */
function pickLine({ recipe, usesUp }: Pick) {
  let uses = ""
  if (usesUp) {
    const n = daysUntil(usesUp.date)
    const name = lower(usesUp.item.name)
    uses = n <= 0 ? `, and it uses up the ${name}` : `, and it uses the ${name} before ${n === 1 ? "tomorrow" : weekday(usesUp.date)}`
  }
  return [recipe.minutes > 0 ? minutesText(recipe.minutes) : "", recipe.serves ? `serves ${recipe.serves}` : "", `you have everything${uses}.`].filter(Boolean).join(" · ")
}

/** The pot from the phone's Tonight card (TonightPotArt), in the theme's pot colours. */
function PotArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" className={className}>
      <path d="M36 30 q-6 -7 0 -14 M50 28 q-6 -7 0 -14 M64 30 q-6 -7 0 -14" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" />
      <path d="M22 54 Q50 30 78 54 Z" fill="currentColor" />
      <circle cx={50} cy={38} r={5} fill="var(--pot-knob)" />
      <path d="M14 56 H86" stroke="currentColor" strokeWidth={4} strokeLinecap="round" />
      <path d="M20 60 H80 V76 Q80 90 66 90 H34 Q20 90 20 76 Z" fill="var(--pot-body)" />
      <path d="M20 66 H10 M80 66 H90" stroke="var(--pot-body)" strokeWidth={5} strokeLinecap="round" />
      <path d="M28 72 H72" stroke="var(--status-out)" strokeWidth={2} strokeDasharray="2 5" strokeLinecap="round" />
    </svg>
  )
}

function Tonight() {
  const { db, items } = usePantry()
  const picks = React.useMemo(() => tonightPicks(db.recipes, items), [db.recipes, items])
  const [at, setAt] = React.useState(0)
  // The card's label follows the time of day, as on the phone.
  const label = new Date().getHours() < 15 ? "Today" : "Tonight"
  const i = picks.length ? at % picks.length : 0
  const pick = picks[i]
  const others = picks.length > 1 ? [1, 2].map((k) => (i + k) % picks.length).filter((k, n, a) => k !== i && a.indexOf(k) === n) : []

  return (
    <section aria-labelledby="tonight" className="flex min-h-[420px] flex-col justify-between gap-6 rounded-lg bg-(--status-out) p-11 text-(--status-out-foreground)">
      <div className="flex items-start justify-between gap-8">
        <div className="flex min-w-0 flex-col gap-4">
          <Eyebrow className="text-[13px] text-(--status-out-foreground)">{label}</Eyebrow>
          {pick ? (
            <>
              <h2 id="tonight" className="font-serif text-[54px] leading-[1.05] font-bold">{pick.recipe.name}</h2>
              <p className="max-w-[640px] text-lg leading-snug">{pickLine(pick)}</p>
            </>
          ) : (
            <>
              <h2 id="tonight" className="font-serif text-[44px] leading-[1.05] font-bold">Nothing you can cook from what's in</h2>
              <p className="max-w-[640px] text-lg leading-snug">Every recipe is short of something. Recipes shows what each one needs.</p>
            </>
          )}
        </div>
        <PotArt className="mt-16 size-52 shrink-0" />
      </div>
      <div className="flex flex-col gap-5">
        <div className="flex gap-3">
          {pick ? (
            <>
              <Button size="lg" className="h-14 bg-(--focus) px-8 text-(--focus-foreground) hover:bg-(--focus)/90" onClick={() => navigate({ name: "recipe-full", id: pick.recipe.id, tab: "cook" })}>
                Start cooking
              </Button>
              {picks.length > 1 && (
                <Button size="lg" variant="outline" className="h-14 border-(--status-out-foreground) bg-transparent px-7 text-(--status-out-foreground) hover:bg-(--status-out-foreground)/10" onClick={() => setAt(i + 1)}>
                  Another
                </Button>
              )}
            </>
          ) : (
            <Button size="lg" className="h-14 bg-(--focus) px-8 text-(--focus-foreground) hover:bg-(--focus)/90" onClick={() => navigate({ name: "recipes", tab: "cook" })}>
              See recipes
            </Button>
          )}
        </div>
        {others.length > 0 && (
          <p className="text-[15px]">
            Or:{" "}
            {others.map((k, n) => (
              <React.Fragment key={picks[k].recipe.id}>
                {n > 0 && " · "}
                <button type="button" className="underline underline-offset-4 hover:no-underline" onClick={() => setAt(k)}>
                  {picks[k].recipe.name}
                </button>
              </React.Fragment>
            ))}
          </p>
        )}
      </div>
    </section>
  )
}

// ---------- Use it up ----------

/** In stock with a use-by within this many days (or past it). */
const USE_UP_DAYS = 7
const USE_UP_SHOWN = 4

/** Today, tomorrow or past: an orange pill. The two days after: a pale pill with the weekday. Later: the date. */
function WhenPill({ date }: { date: string }) {
  const n = daysUntil(date)
  if (n <= 1) {
    return (
      <span className="shrink-0 rounded-full bg-(--nav-active) px-3.5 py-1 text-[11px] font-semibold tracking-widest text-(--status-out-foreground) uppercase">
        {n < 0 ? "Past its date" : n === 0 ? "Today" : "Tomorrow"}
      </span>
    )
  }
  if (n <= 3) {
    return (
      <span className="shrink-0 rounded-full border border-(--status-low-border) bg-(--status-low) px-3.5 py-1 text-[11px] font-semibold tracking-widest text-(--status-low-foreground) uppercase">
        {weekday(date)}
      </span>
    )
  }
  return <span className="shrink-0 text-sm text-muted-foreground">{local(date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}</span>
}

function UseItUp({ all }: { all: Item[] }) {
  const [more, setMore] = React.useState(false)
  const due = all
    .filter((i) => i.inStock > 0)
    .map((item) => ({ item, date: soonest(item) }))
    .filter((d): d is { item: Item; date: string } => !!d.date && daysUntil(d.date) <= USE_UP_DAYS)
    .sort((a, b) => a.date.localeCompare(b.date) || a.item.name.localeCompare(b.item.name))
  const shown = more ? due : due.slice(0, USE_UP_SHOWN)
  return (
    <section aria-labelledby="use-it-up" data-tour="use-today" className="flex flex-col gap-4 rounded-lg border border-border bg-card/40 p-10">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="use-it-up"><Eyebrow className="text-[13px] text-foreground">Use it up</Eyebrow></h2>
        {due.length > USE_UP_SHOWN && (
          <button type="button" className="text-sm underline underline-offset-4 hover:no-underline" onClick={() => setMore(!more)}>
            {more ? "Show fewer" : `See all ${due.length}`}
          </button>
        )}
      </div>
      {shown.length ? (
        <ul className="flex flex-col">
          {shown.map(({ item, date }) => (
            <li key={item.id} className="border-b border-border last:border-b-0">
              <button type="button" className="flex w-full items-center justify-between gap-4 py-3.5 text-left hover:bg-muted/50" onClick={() => navigate({ name: "home", item: item.id })}>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-[19px] font-semibold">{item.name}</span>
                  <span className="text-sm text-muted-foreground">{[locationLabel(item.location), isBulk(item) && item.open ? "open" : null].filter(Boolean).join(" · ")}</span>
                </span>
                <WhenPill date={date} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Nothing goes off in the next week.</p>
      )}
    </section>
  )
}

// ---------- the next shop ----------

function NextShop() {
  const { db, items } = usePantry()
  const rows = listRows(items).filter((r) => !r.item.ordered)
  if (!rows.length) return null
  const store = db.stores.find((s) => s.id === db.defaultStoreId) ?? db.stores[0]
  const total = listTotal(rows)
  const low = rows.filter((r) => isStaple(r.item) && stockOf(r.item) !== null).length
  const line = [
    store?.name,
    total.pence > 0 ? `${total.approximate ? "about " : ""}£${Math.round(total.pence / 100)}` : null,
    low ? `${low} ${low === 1 ? "Staple" : "Staples"} running low` : null,
  ].filter(Boolean).join(" · ")
  return (
    <section aria-labelledby="next-shop" className="flex flex-col justify-between gap-6 rounded-lg bg-(--focus) p-10 text-(--focus-foreground)">
      <div className="flex flex-col gap-4">
        <h2 id="next-shop"><Eyebrow className="text-[13px] text-(--focus-foreground)">Next shop</Eyebrow></h2>
        <p className="flex items-baseline gap-4">
          <span className="font-serif text-[72px] leading-none font-bold tabular-nums">{rows.length}</span>
          <span className="text-2xl">{rows.length === 1 ? "thing" : "things"}</span>
        </p>
        <p className="text-lg text-(--focus-muted)">{line}</p>
      </div>
      <Button size="lg" className="h-14 self-start bg-(--focus-gold) px-7 text-(--focus-gold-foreground) hover:bg-(--focus-gold)/90" onClick={() => navigate({ name: "list" })}>
        Open the list
      </Button>
    </section>
  )
}

// ---------- Used one? Tap it ----------

const TILES = 8

function UsedTile({ item }: { item: Item }) {
  const { actions } = usePantry()
  const bulk = isBulk(item)
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-5 py-5">
      <button type="button" className="min-w-0 truncate text-left text-[17px] font-semibold hover:underline" onClick={() => navigate({ name: "home", item: item.id })}>
        {item.name}
      </button>
      {bulk ? (
        <button
          type="button"
          className="shrink-0 rounded-sm px-1.5 py-1 text-[15px] text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label={`Finished a pack of ${lower(item.name)}`}
          onClick={() => actions.finishPack(item.id)}
        >
          Finished
        </button>
      ) : (
        <span className="flex shrink-0 items-center gap-1 text-[15px] tabular-nums text-muted-foreground">
          <span aria-label={`${item.inStock} in stock`}>{item.inStock}</span>
          <span aria-hidden="true">·</span>
          <button type="button" className="rounded-sm px-1.5 py-1 hover:bg-muted hover:text-foreground" aria-label={`Used one ${lower(item.name)}`} onClick={() => actions.useOne(item.id)}>
            −1
          </button>
        </span>
      )}
    </div>
  )
}

function UsedOne({ all }: { all: Item[] }) {
  const often = all.filter((i) => i.inStock > 0).sort((a, b) => (b.uses ?? 0) - (a.uses ?? 0) || a.name.localeCompare(b.name)).slice(0, TILES)
  return (
    <section aria-labelledby="used-one" data-tour="use-field" className="flex flex-col gap-6 rounded-lg border border-border bg-card/40 p-10">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="used-one"><Eyebrow className="text-[13px] text-foreground">Used one? Tap it</Eyebrow></h2>
        <a href="#/pantry" className="text-sm underline underline-offset-4 hover:no-underline">All {all.length} items</a>
      </div>
      {often.length ? (
        <div className="grid grid-cols-4 gap-3">
          {often.map((i) => <UsedTile key={i.id} item={i} />)}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Nothing in stock yet.</p>
      )}
    </section>
  )
}

// ---------- Insights ----------

function Insights() {
  return (
    <section aria-labelledby="insights" className="flex max-w-[720px] flex-col gap-3 rounded-lg border border-border p-10">
      <h2 id="insights"><Eyebrow className="text-[13px] text-foreground">Insights are on the way</Eyebrow></h2>
      <p className="text-lg leading-snug">
        Spending, shops, what you cooked and what you threw out need a record of each shop: what you bought, where and
        for how much. The app doesn't keep one yet. Once it does, this page fills up from that day.
      </p>
    </section>
  )
}

// ---------- the page ----------

export function Home({ item, recipe }: { item?: string; recipe?: string }) {
  const { items } = usePantry()
  const [view, setView] = React.useState<View>("today")
  const all = Object.values(items).filter((i) => !i.oneOff)
  const soon = all.filter((i) => i.inStock > 0 && goingOffSoon(i)).sort((a, b) => (soonest(a) ?? "").localeCompare(soonest(b) ?? ""))
  const hasShop = listRows(items).some((r) => !r.item.ordered)
  const sub = view === "insights"
    ? "What you bought, cooked and threw out."
    : soon.length
      ? `${namesText(soon).replace(/^the/, "The")} ${soon.length === 1 ? "wants" : "want"} using soon.`
      : "Nothing needs using up."

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex min-w-0 flex-1 flex-col gap-8 overflow-y-auto px-14 py-12">
        <header className="flex flex-wrap items-end justify-between gap-6 border-b border-border pb-8">
          <div className="flex min-w-0 flex-col gap-3">
            <Eyebrow className="text-[13px]">{dateLine()}</Eyebrow>
            <h1 className="font-serif text-[64px] leading-none font-bold">{view === "insights" ? "How it's going" : greeting()}</h1>
            <p className="text-xl text-muted-foreground">{sub}</p>
          </div>
          <Segmented<View>
            label="Home view"
            value={view}
            onChange={setView}
            className="h-14 w-[420px] [&>button]:h-14 [&>button]:text-sm [&>button]:tracking-widest"
            options={[
              { value: "today", label: "Today" },
              { value: "insights", label: "Insights" },
            ]}
          />
        </header>

        {view === "today" ? (
          <>
            <div className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-8">
              <Tonight />
              <UseItUp all={all} />
            </div>
            <div className={cn("grid gap-8", hasShop && "grid-cols-[minmax(0,1fr)_minmax(0,2fr)]")}>
              <NextShop />
              <UsedOne all={all} />
            </div>
            <ReviewBar />
          </>
        ) : (
          <Insights />
        )}
      </div>
      <ItemPanel id={item} onClose={() => navigate({ name: "home" })} />
      <RecipePanel id={recipe} onClose={() => navigate({ name: "home" })} />
    </div>
  )
}

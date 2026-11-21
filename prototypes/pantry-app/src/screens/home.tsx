// PAN-09: quick use. Record what you used in a couple of clicks, see History, and what to cook first.
import * as React from "react"
import { CopyIcon, SearchIcon, SmartphoneIcon } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { FilterChips } from "@/components/ui/filter-chips"
import {
  containsText, dateText, daysUntil, haveText, inStockText, isToday, lower, recipesUsing, shortDate, soonest, isBulk, locationLabel, namesOf, recipeInfo, timeText, type Db, type HistoryEntry, type Item, type Items, type Location, type Who,
} from "../model"
import { href, navigate } from "../router"
import { canRevert, canUndo, usePantry } from "../state"
import { Eyebrow, ExpiryAlert, HistoryRow, StockPill, type HistoryLinks } from "../components"
import { CategoryMark } from "../category-look"
import { QuickUseActions } from "../quick-use"
import { ItemPanel } from "./item-panel"
import { RecipePanel } from "./recipe"

type Group = "often" | Location

/** PAN-09 tile: name, where, a big number, Out or Low, and the actions that fit the type. */
function QuickUseTile({ item }: { item: Item }) {
  const { db } = usePantry()
  const category = db.categories.find((c) => c.id === item.categoryId)
  const bulk = isBulk(item)
  const where = [locationLabel(item.location), bulk && item.inStock ? haveText(item).replace(/^\d+ /, "") : null].filter(Boolean).join(" · ")
  return (
    <div className={cn("flex flex-col justify-between gap-4 rounded-lg border border-border p-4", item.inStock === 0 && "bg-muted")}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <CategoryMark category={category} size="lg" />
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="flex items-center gap-1.5">
              <button type="button" className="text-left text-[15px] leading-tight font-semibold hover:underline" onClick={() => navigate({ name: "home", item: item.id })}>
                {item.name}
              </button>
              <ExpiryAlert item={item} />
            </span>
            <span className="text-xs text-muted-foreground">{where}</span>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="text-[28px] leading-none font-semibold tabular-nums" aria-label={`${haveText(item)} in stock`}>
            {item.inStock}
          </span>
          <StockPill item={item} />
        </div>
      </div>
      {item.inStock === 0 ? (
        <span className="text-xs text-muted-foreground">None left{item.target > 0 ? " · on the shopping list" : ""}</span>
      ) : (
        <QuickUseActions item={item} />
      )}
    </div>
  )
}

const MAX_ITEM_LINKS = 4

/**
 * What a History entry links to. A recipe or a single item opens in the side panel here; an entry
 * about several items links each one. Store and category changes go to their settings. Things that
 * have since been deleted don't link.
 */
function linksFor(entry: HistoryEntry, db: Db, items: Items): HistoryLinks | undefined {
  const recipe = entry.recipeId ? db.recipes.find((r) => r.id === entry.recipeId) : undefined
  const live = [...new Set(entry.itemIds ?? [])].filter((id) => items[id])
  const itemLinks = live.length > 1
    ? { items: live.slice(0, MAX_ITEM_LINKS).map((id) => ({ href: href({ name: "home", item: id }), label: items[id].name })), more: Math.max(0, live.length - MAX_ITEM_LINKS) }
    : {}
  if (recipe) return { href: href({ name: "home", recipe: recipe.id }), ...itemLinks }
  if (live.length === 1) return { href: href({ name: "home", item: live[0] }) }
  if (entry.itemIds?.length) return itemLinks
  // No item or recipe: a category or store change. Claude's store entries carry no store id, so
  // the store is found by its name in the title (the longest name wins, so "Co-op" loses to "Co-op Express").
  if (/\bcategory\b/i.test(entry.title)) return { href: href({ name: "settings", tab: "categories" }) }
  const store = [...db.stores].sort((a, b) => b.name.length - a.name.length).find((x) => x.name && entry.title.includes(x.name))
  if (store) return { href: href({ name: "settings", tab: "stores", store: store.id }) }
  if (/\bstore\b/i.test(entry.title)) return { href: href({ name: "settings", tab: "stores" }) }
  return undefined
}

function History() {
  const { db, items, actions, phoneSyncedAt } = usePantry()
  const [who, setWho] = React.useState<"all" | Who>("all")
  const [shown, setShown] = React.useState(6)
  const entries = db.history.filter((h) => who === "all" || h.who === who)
  return (
    <section aria-label="History" data-tour="history" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold tracking-widest uppercase">History</h2>
        <span className="text-xs text-muted-foreground">Undo works for today's changes</span>
      </div>
      <FilterChips
        aria-label="Who made the change"
        value={who}
        onValueChange={(v) => {
          setWho(v)
          setShown(6)
        }}
        options={[
          { value: "all", label: "All" },
          { value: "you", label: "You" },
          { value: "claude", label: "Claude" },
          { value: "phone", label: "Shopping app" },
        ]}
        className="flex-wrap [&>button]:h-7 [&>button]:px-2.5 [&>button]:text-[10px]"
      />
      <div className="flex flex-col">
        {entries.slice(0, shown).map((h) => (
          <HistoryRow key={h.id} entry={h} compact links={linksFor(h, db, items)} onUndo={canUndo(h) ? () => actions.undo(h.id) : undefined} onRevert={canRevert(h) ? () => actions.revert(h.id) : undefined} />
        ))}
        {entries.length === 0 && <p className="py-4 text-sm text-muted-foreground">Nothing yet.</p>}
      </div>
      {entries.length > shown && (
        <Button variant="link" className="h-auto self-start p-0 text-xs normal-case tracking-normal" onClick={() => setShown(shown + 10)}>
          Show older
        </Button>
      )}
      <span className="flex items-center gap-1.5 border-t border-border pt-3 text-xs text-muted-foreground" title="When the shopping app last synced with the pantry">
        <SmartphoneIcon className="size-3.5" aria-hidden="true" />
        Phone synced {isToday(phoneSyncedAt) ? "today" : shortDate(phoneSyncedAt)}, {timeText(phoneSyncedAt)}
      </span>
    </section>
  )
}

// ---------- Use today ----------

/** Recipes for an item that's due: ones you can cook now first, then the fewest short, then A to Z. Up to three. */
function suggestions(itemId: string, db: Db, items: Items) {
  return recipesUsing(db.recipes, itemId)
    .map((recipe) => ({ recipe, info: recipeInfo(recipe, items) }))
    .sort((a, b) => Number(b.info.canCook) - Number(a.info.canCook) || a.info.short.length - b.info.short.length || a.recipe.name.localeCompare(b.recipe.name))
    .slice(0, 3)
}

function UseTodayCard({ item }: { item: Item }) {
  const { db, items } = usePantry()
  const date = soonest(item)!
  const n = daysUntil(date)
  const recipes = suggestions(item.id, db, items)
  const ask = `Find me a recipe that uses ${lower(item.name)} and save it to my pantry`
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="flex items-center gap-1.5">
            <button type="button" className="text-left text-[15px] leading-tight font-semibold hover:underline" onClick={() => navigate({ name: "home", item: item.id })}>
              {item.name}
            </button>
            <ExpiryAlert item={item} />
          </span>
          <span className="text-xs text-muted-foreground">
            {n === 0 ? "Use by today" : `Was due ${n === -1 ? "yesterday" : dateText(date)}`} · {inStockText(item, ", ")}
          </span>
        </div>
        <QuickUseActions item={item} compact className="shrink-0" />
      </div>
      {recipes.length ? (
        <ul className="flex flex-col border-t border-border" aria-label={`Recipes that use ${lower(item.name)}`}>
          {recipes.map(({ recipe, info }) => (
            <li key={recipe.id} className="border-b border-border last:border-b-0">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 py-2 text-left text-sm transition-colors hover:bg-muted"
                onClick={() => navigate({ name: "home", recipe: recipe.id })}
              >
                <span className="min-w-0 truncate">{recipe.name}</span>
                <Badge variant={info.canCook ? "solid" : "outlined"} className="shrink-0">{info.canCook ? "Can cook" : `Short ${info.short.length}`}</Badge>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
          <span className="text-xs text-muted-foreground">No recipes use it yet.</span>
          <Button
            size="xs"
            variant="outline"
            className="h-8 shrink-0 border-primary"
            onClick={() => {
              navigator.clipboard?.writeText(ask).catch(() => {})
              toast("Copied a message for Claude", { description: `"${ask}". Paste it into Claude, on your phone or here.` })
            }}
          >
            <CopyIcon />
            Ask Claude for one
          </Button>
        </div>
      )}
    </div>
  )
}

/** Items in stock at or past their use-by date, with recipes that use each. Nothing shows when nothing is due. */
function UseToday({ all }: { all: Item[] }) {
  const due = all
    .map((item) => ({ item, date: soonest(item) }))
    .filter((d): d is { item: Item; date: string } => !!d.date && daysUntil(d.date) <= 0)
    .sort((a, b) => a.date.localeCompare(b.date) || a.item.name.localeCompare(b.item.name))
  if (!due.length) return null
  return (
    <section aria-labelledby="use-today" data-tour="use-today" className="flex flex-col gap-3">
      <div className="flex items-baseline gap-4">
        <h2 id="use-today"><Eyebrow className="text-foreground">Use today · {due.length}</Eyebrow></h2>
        <span className="text-[13px] text-muted-foreground">At or past the use-by date, with recipes that use them</span>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-3">
        {due.map(({ item }) => <UseTodayCard key={item.id} item={item} />)}
      </div>
    </section>
  )
}

export function Home({ item, recipe }: { item?: string; recipe?: string }) {
  const { items } = usePantry()
  const [query, setQuery] = React.useState("")
  const [group, setGroup] = React.useState<Group>("often")
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || (e.target as HTMLElement).closest("input, textarea")) return
      e.preventDefault()
      inputRef.current?.focus()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  // Home is for recording what you used, so the field is ready to type into. Not when Home opens with a
  // side panel: the panel takes the focus.
  React.useEffect(() => {
    if (!item && !recipe) inputRef.current?.focus({ preventScroll: true })
    // Only on arriving at Home.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const all = Object.values(items).filter((i) => !i.oneOff)
  const often = all.filter((i) => i.inStock > 0).sort((a, b) => (b.uses ?? 0) - (a.uses ?? 0)).slice(0, 12)
  const byLocation = (l: Location) => all.filter((i) => i.location === l && i.inStock > 0).sort((a, b) => a.name.localeCompare(b.name))
  const q = query.trim()
  const tiles = q
    ? all.filter((i) => namesOf(i).some((n) => containsText(n, q))).sort((a, b) => b.inStock - a.inStock)
    : group === "often" ? often : byLocation(group)

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex min-w-0 flex-1 flex-col gap-6 overflow-y-auto px-8 py-8">
        <label data-tour="use-field" className="flex shrink-0 items-center gap-4 rounded-lg border border-primary px-5 py-5 focus-within:ring-1 focus-within:ring-inset focus-within:ring-primary">
          <SearchIcon className="size-5 shrink-0" aria-hidden="true" />
          <input
            ref={inputRef}
            data-page-search
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setQuery("")}
            placeholder="What did you use?"
            aria-label="What did you use?"
            className="min-w-0 flex-1 bg-transparent text-2xl outline-none! placeholder:text-muted-foreground"
          />
          <Eyebrow>Press / to search</Eyebrow>
        </label>

        {!q && <UseToday all={all} />}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-baseline gap-4">
            <Eyebrow className="text-foreground">{q ? `Matching "${q}"` : group === "often" ? "Used most often" : locationLabel(group)}</Eyebrow>
            <a href="#/pantry" className="text-[13px] underline underline-offset-4">
              See all {all.length} items in the pantry
            </a>
          </div>
          {!q && (
            <FilterChips<Group>
              aria-label="Show"
              value={group}
              onValueChange={setGroup}
              options={[
                { value: "often", label: "Often used", count: often.length },
                { value: "fridge", label: "Fridge", count: byLocation("fridge").length },
                { value: "cupboard", label: "Cupboard", count: byLocation("cupboard").length },
                { value: "freezer", label: "Freezer", count: byLocation("freezer").length },
                { value: "counter", label: "Counter", count: byLocation("counter").length },
                { value: "household", label: "Other", count: byLocation("household").length },
              ]}
            />
          )}
        </div>

        {tiles.length ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
            {tiles.map((i) => (
              <QuickUseTile key={i.id} item={i} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-start gap-3 py-6">
            <p className="text-sm text-muted-foreground">{q ? `Nothing in the pantry called "${q}".` : "Nothing in stock here."}</p>
            {q && (
              <Button variant="outline" onClick={() => navigate({ name: "pantry", item: "new", prefill: q })}>
                Add "{q}" as an item
              </Button>
            )}
          </div>
        )}
      </div>

      <aside className="flex w-[360px] shrink-0 flex-col gap-8 overflow-y-auto border-l border-border bg-muted/50 px-6 py-8">
        <History />
        <p className="mt-auto text-xs text-muted-foreground">A Staple that drops below its minimum goes on the shopping list by itself.</p>
      </aside>
      <ItemPanel id={item} onClose={() => navigate({ name: "home" })} />
      <RecipePanel id={recipe} onClose={() => navigate({ name: "home" })} />
    </div>
  )
}

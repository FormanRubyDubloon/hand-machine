// PAN-09: quick use. Record what you used in a couple of clicks, see History, and what to cook first.
import * as React from "react"
import { SearchIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { FilterChips } from "@/components/ui/filter-chips"
import {
  byUseFirst, containsText, haveText, isBulk, locationLabel, namesOf, recipeInfo, unitWord, usesUpText, type Item, type Location, type Who,
} from "../model"
import { navigate } from "../router"
import { canUndo, usePantry } from "../state"
import { Eyebrow, HistoryRow, StockPill } from "../components"

type Group = "often" | Location

/** PAN-09 tile: name, where, a big number, Out or Low, and the actions that fit the type. */
function QuickUseTile({ item }: { item: Item }) {
  const { actions } = usePantry()
  const bulk = isBulk(item)
  const where = [locationLabel(item.location), bulk && item.inStock ? haveText(item).replace(/^\d+ /, "") : null].filter(Boolean).join(" · ")
  const canOpen = bulk && (item.open ?? 0) < item.inStock
  return (
    <div className={cn("flex flex-col justify-between gap-4 border border-border p-4", item.inStock === 0 && "bg-muted")}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <button type="button" className="text-left text-[15px] leading-tight font-semibold hover:underline" onClick={() => navigate({ name: "pantry", item: item.id })}>
            {item.name}
          </button>
          <span className="text-xs text-muted-foreground">{where}</span>
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
      ) : bulk ? (
        <div className="flex gap-2">
          <Button size="xs" className="h-9 min-w-0 flex-1 px-2" onClick={() => actions.finishPack(item.id)}>
            Finished it
          </Button>
          {canOpen && (
            <Button size="xs" variant="outline" className="h-9 min-w-0 flex-1 border-primary px-2" onClick={() => actions.openPack(item.id)}>
              {item.open ? "Open another" : "Open one"}
            </Button>
          )}
        </div>
      ) : (
        <div className="flex gap-2">
          <Button size="xs" className="h-9 flex-1" onClick={() => actions.useOne(item.id)}>
            Used 1
          </Button>
          <Button size="xs" variant="outline" className="h-9 border-primary px-4" onClick={() => actions.useAll(item.id)} aria-label={`Used all ${unitWord(item, 2) || item.name.toLowerCase()}`}>
            All
          </Button>
        </div>
      )}
    </div>
  )
}

function History() {
  const { db, actions } = usePantry()
  const [who, setWho] = React.useState<"all" | Who>("all")
  const [shown, setShown] = React.useState(6)
  const entries = db.history.filter((h) => who === "all" || h.who === who)
  return (
    <section aria-label="History" className="flex flex-col gap-3">
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
          <HistoryRow key={h.id} entry={h} compact onUndo={canUndo(h) ? () => actions.undo(h.id) : undefined} />
        ))}
        {entries.length === 0 && <p className="py-4 text-sm text-muted-foreground">Nothing yet.</p>}
      </div>
      {entries.length > shown && (
        <Button variant="link" className="h-auto self-start p-0 text-xs normal-case tracking-normal" onClick={() => setShown(shown + 10)}>
          Show older
        </Button>
      )}
    </section>
  )
}

function CookFirst() {
  const { db, items } = usePantry()
  const ready = db.recipes
    .map((recipe) => ({ recipe, info: recipeInfo(recipe, items) }))
    .filter((r) => r.info.canCook && r.info.usesUp)
    .sort(byUseFirst)
    .slice(0, 3)
  if (!ready.length) return null
  return (
    <section aria-label="Cook these first" className="flex flex-col gap-2">
      <Eyebrow className="text-foreground">Cook these first</Eyebrow>
      {ready.map(({ recipe, info }) => (
        <button
          key={recipe.id}
          type="button"
          onClick={() => navigate({ name: "recipes", tab: "cook", recipe: recipe.id })}
          className="flex flex-col gap-0.5 border border-border bg-background p-3 text-left transition-colors hover:bg-muted"
        >
          <span className="text-sm font-semibold">{recipe.name}</span>
          <span className="text-xs text-muted-foreground">{usesUpText(info.usesUp)}</span>
        </button>
      ))}
    </section>
  )
}

export function Home() {
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
        <label className="flex h-16 items-center gap-4 border border-primary px-5 focus-within:ring-2 focus-within:ring-ring/30">
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
            className="min-w-0 flex-1 bg-transparent text-2xl outline-none placeholder:text-muted-foreground"
          />
          <Eyebrow>Press / to search</Eyebrow>
        </label>

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
        <CookFirst />
        <p className="mt-auto text-xs text-muted-foreground">A Staple that drops below its minimum goes on the shopping list by itself.</p>
      </aside>
    </div>
  )
}

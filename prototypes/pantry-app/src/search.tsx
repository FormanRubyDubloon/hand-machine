// PAN-20 and PAN-21: search in the top bar. Results from the pantry, recipes and the shopping list
// together, with ↑↓ and Enter. No matches offers "Did you mean" and three ways to add it.
import * as React from "react"
import { CornerDownLeftIcon, PlusIcon, SearchIcon, TagIcon } from "lucide-react"
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command"
import { Command as CommandPrimitive } from "cmdk"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  containsText, distance, inStockText, isStaple, listRows, locationLabel, namesOf, needOf, recipeInfo, shortNames, soonest, dateText,
  usesUpText, unitText, lower, type Item,
} from "./model"
import { minutesText } from "../../shared/src/pantry"
import { navigate } from "./router"
import { usePantry } from "./state"
import { Eyebrow, ExpiryAlert, StockPill, TagPill } from "./components"
import { QuickUseActions } from "./quick-use"

/** The name with the matching part in bold. */
function Highlight({ text, query }: { text: string; query: string }) {
  const i = text.toLowerCase().indexOf(query.trim().toLowerCase())
  if (i < 0 || !query.trim()) return <>{text}</>
  const end = i + query.trim().length
  return (
    <>
      {text.slice(0, i)}
      <strong className="font-bold">{text.slice(i, end)}</strong>
      {text.slice(end)}
    </>
  )
}

const itemLine = (i: Item) =>
  [locationLabel(i.location), inStockText(i), isStaple(i) ? `${i.target} min` : "not a Staple"].join(" · ")

export function Search() {
  const { items, db, actions } = usePantry()
  const [query, setQuery] = React.useState("")
  const [open, setOpen] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const q = query.trim()

  // "/" jumps to search from anywhere, unless the page has its own (Home does).
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (e.key !== "/" || target.closest("input, textarea, [contenteditable]")) return
      if (document.querySelector("[data-page-search]")) return
      e.preventDefault()
      inputRef.current?.focus()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const pantry = Object.values(items).filter((i) => !i.oneOff && namesOf(i).some((n) => containsText(n, q)))
  const recipes = db.recipes.filter((r) => containsText(r.name, q) || r.ingredients.some((g) => containsText(g.text, q)))
  const list = listRows(items).filter((r) => namesOf(r.item).some((n) => containsText(n, q)))
  const total = pantry.length + recipes.length + list.length

  const suggestion = React.useMemo(() => {
    if (!q || total) return null
    let best: { item: Item; d: number } | null = null
    for (const i of Object.values(items)) {
      for (const n of namesOf(i)) {
        const d = distance(n.toLowerCase(), q.toLowerCase())
        if (d <= Math.max(2, Math.floor(q.length / 4)) && (!best || d < best.d)) best = { item: i, d }
      }
    }
    return best?.item ?? null
  }, [q, total, items])

  const go = (fn: () => void) => {
    fn()
    setOpen(false)
    setQuery("")
    inputRef.current?.blur()
  }

  return (
    <Command shouldFilter={false} loop className="relative w-72 overflow-visible bg-transparent" label="Search">
      <label className="flex h-10 items-center gap-2 border-b border-ring text-muted-foreground focus-within:border-foreground">
        <SearchIcon className="size-4 shrink-0" aria-hidden="true" />
        <CommandPrimitive.Input
          ref={inputRef}
          value={query}
          onValueChange={(v) => {
            setQuery(v)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setQuery("")
              inputRef.current?.blur()
            }
          }}
          placeholder="Search pantry, recipes, list"
          aria-label="Search pantry, recipes and shopping list"
          className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
      </label>
      {open && q && (
        <div className="absolute top-full right-0 z-50 mt-2 w-[460px] bg-popover text-popover-foreground shadow-lg ring-1 ring-foreground/10">
          <CommandList className="max-h-[70vh]">
            {total > 0 ? (
              <>
                {pantry.length > 0 && (
                  <CommandGroup heading={`Pantry · ${pantry.length}`}>
                    {pantry.slice(0, 6).map((i) => (
                      <CommandItem key={i.id} value={`item-${i.id}`} onSelect={() => go(() => navigate({ name: "pantry", item: i.id }))} className="items-center py-2.5">
                        <div className="flex min-w-0 flex-1 flex-col">
                          <span className="flex items-center gap-2 text-sm font-medium">
                            <span className="truncate"><Highlight text={i.name} query={q} /></span>
                            <ExpiryAlert item={i} />
                            <StockPill item={i} />
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {itemLine(i)}
                            {!isStaple(i) && soonest(i) && ` · use by ${lower(dateText(soonest(i)))}`}
                          </span>
                        </div>
                        <QuickUseActions item={i} compact className="shrink-0 self-center" />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                {recipes.length > 0 && (
                  <CommandGroup heading={`Recipes · ${recipes.length}`}>
                    {recipes.slice(0, 6).map((r) => {
                      const info = recipeInfo(r, items)
                      return (
                        <CommandItem key={r.id} value={`recipe-${r.id}`} onSelect={() => go(() => navigate({ name: "recipes", tab: "cook", recipe: r.id }))} className="items-start py-2.5">
                          <div className="flex min-w-0 flex-1 flex-col">
                            <span className="text-sm font-medium"><Highlight text={r.name} query={q} /></span>
                            <span className="text-xs text-muted-foreground">
                              {minutesText(r.minutes)} · {info.canCook ? usesUpText(info.usesUp) ?? "everything in stock" : `short of ${shortNames(info).toLowerCase()}`}
                            </span>
                          </div>
                          <Badge variant={info.canCook ? "solid" : "outlined"}>{info.canCook ? "Can cook" : `Short ${info.short.length}`}</Badge>
                        </CommandItem>
                      )
                    })}
                  </CommandGroup>
                )}
                {list.length > 0 && (
                  <CommandGroup heading={`Shopping list · ${list.length}`}>
                    {list.slice(0, 6).map((r) => (
                      <CommandItem key={r.item.id} value={`list-${r.item.id}`} onSelect={() => go(() => navigate({ name: "list" }))} className="py-2.5">
                        <div className="flex min-w-0 flex-1 flex-col">
                          <span className="text-sm font-medium"><Highlight text={r.item.name} query={q} /></span>
                          <span className="text-xs text-muted-foreground">
                            {unitText(r.item, needOf(r.item))} to buy · {db.categories.find((c) => c.id === r.item.categoryId)?.name ?? "No aisle"}
                          </span>
                        </div>
                        <TagPill>{r.group === "staples" ? "Staple" : r.group === "recipes" ? "Recipe" : "Added"}</TagPill>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </>
            ) : (
              <>
                <div className="flex flex-col gap-1 px-4 pt-4 pb-2">
                  <span className="text-sm font-semibold">No matches for "{q}"</span>
                  <span className="text-xs text-muted-foreground">Nothing in your pantry, recipes or shopping list.</span>
                </div>
                {suggestion && (
                  <CommandGroup heading="Did you mean">
                    <CommandItem value="suggestion" onSelect={() => go(() => navigate({ name: "pantry", item: suggestion.id }))} className="py-2.5">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{suggestion.name}</span>
                        <span className="text-xs text-muted-foreground">Pantry · {itemLine(suggestion)}</span>
                      </div>
                    </CommandItem>
                  </CommandGroup>
                )}
                <CommandGroup heading="Or">
                  <CommandItem value="add-item" onSelect={() => go(() => navigate({ name: "pantry", item: "new", prefill: q }))} className="py-2.5">
                    <PlusIcon />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">Add "{q}" as a pantry item</span>
                      <span className="text-xs text-muted-foreground">Opens Add item with the name filled in</span>
                    </div>
                  </CommandItem>
                  <CommandItem value="add-list" onSelect={() => go(() => actions.addOneOff(q))} className="py-2.5">
                    <PlusIcon />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">Add "{q}" to the shopping list</span>
                      <span className="text-xs text-muted-foreground">As a one-off</span>
                    </div>
                  </CommandItem>
                  {suggestion && (
                    <CommandItem value="other-name" onSelect={() => go(() => actions.addOtherName(suggestion.id, q))} className="py-2.5">
                      <TagIcon />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">Add "{q}" as another name for {suggestion.name}</span>
                        <span className="text-xs text-muted-foreground">So it matches next time, in search and in recipes</span>
                      </div>
                    </CommandItem>
                  )}
                </CommandGroup>
              </>
            )}
          </CommandList>
          <div className={cn("flex items-center gap-2 border-t border-border px-4 py-2.5")}>
            <Eyebrow>↑↓ to move · Enter to open</Eyebrow>
            <CornerDownLeftIcon className="size-3 text-muted-foreground" aria-hidden="true" />
          </div>
        </div>
      )}
    </Command>
  )
}

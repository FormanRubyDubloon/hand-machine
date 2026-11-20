// REC-07 (What to cook), REC-08 (All recipes) and REC-15 (no recipes yet).
import * as React from "react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FilterChips } from "@/components/ui/filter-chips"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  byUseFirst, dateText, daysUntil, lower, minutesBand, plural, recipeInfo, recipesUsing, recipeTags, shortNames, soonest, toSortOut, usesUpText,
  type Item, type Recipe, type RecipeInfo,
} from "../model"
import { minutesText } from "../../../shared/src/pantry"
import { href, navigate, type RecipesTab, type Route } from "../router"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { usePantry } from "../state"
import { Eyebrow, ExpiryAlert, FilterGroup, FilterSidebar, PageTitle, SortSelect } from "../components"
import { ClaudeExamples } from "./claude"
import { CookedDialog, RecipePanel, WantButton } from "./recipe"
import { tagPhoto } from "../tag-photos"
import { CheckIcon } from "lucide-react"

type Quick = "all" | "dinner" | "quick" | "want"
const quickTest: Record<Quick, (r: Recipe) => boolean> = {
  all: () => true,
  dinner: (r) => r.meal === "Dinner",
  quick: (r) => r.minutes > 0 && r.minutes < 20,
  want: (r) => r.wantToCook,
}

type Ranked = { recipe: Recipe; info: RecipeInfo }

/**
 * Clicks on a card or row open the side panel, except on its own buttons and links, and except clicks inside a
 * dialog one of those buttons opened (React passes those up through the card even though they're drawn elsewhere).
 */
const opensPanel = (e: React.MouseEvent) =>
  e.currentTarget.contains(e.target as Node) && !(e.target as HTMLElement).closest("button, a, input, [role=menuitem]")
/** Enter or Space on the focused card or row itself (not on something inside it). */
const panelKey = (e: React.KeyboardEvent, open: () => void) => {
  if (e.target !== e.currentTarget || (e.key !== "Enter" && e.key !== " ")) return
  e.preventDefault()
  open()
}

/** The recipe's name: a link to the full recipe page. */
function RecipeName({ recipe, tab }: { recipe: Recipe; tab: RecipesTab }) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <a className="text-left text-[15px] leading-tight font-semibold underline-offset-4 hover:underline" href={href({ name: "recipe-full", id: recipe.id, tab })}>
            {recipe.name}
          </a>
        </TooltipTrigger>
        <TooltipContent side="top" align="start">Open the full recipe</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * Flags a recipe with ingredients to sort out: not linked to a pantry item, or short and not on the shopping list.
 * Nothing shows when everything is in stock, on the list or linked.
 */
function SortOutFlag({ recipe, info, className }: Ranked & { className?: string }) {
  const open = toSortOut(info, recipe).map((k) => info.rows[k])
  if (!open.length) return null
  const unlinked = open.filter((r) => !r.item).length
  const unlisted = open.length - unlinked
  const parts = [unlinked && `${unlinked} not linked`, unlisted && `${unlisted} not on list`].filter(Boolean) as string[]
  const names = open.map((r) => r.item?.name ?? r.text).join(", ")
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-widest whitespace-nowrap uppercase", className)} title={names}>
      <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-primary" />
      {parts.join(" · ")}
    </span>
  )
}

function RecipeCard({ recipe, info, onCooked }: Ranked & { onCooked: () => void }) {
  const uses = usesUpText(info.usesUp)
  const open = () => navigate({ name: "recipes", tab: "cook", recipe: recipe.id })
  return (
    <div
      tabIndex={0}
      aria-label={`${recipe.name}: open in the side panel`}
      className={cn(
        "flex cursor-pointer flex-col gap-2 border bg-background p-4 transition-colors outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring",
        info.canCook && info.usesUp ? "border-primary" : "border-border",
      )}
      onClick={(e) => opensPanel(e) && open()}
      onKeyDown={(e) => panelKey(e, open)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <RecipeName recipe={recipe} tab="cook" />
          <span className="text-xs text-muted-foreground">{[minutesText(recipe.minutes), `Serves ${recipe.serves}`, ...recipeTags(recipe)].join(" · ")}</span>
        </div>
        {info.canCook ? (
          <Button size="xs" variant="outline" className="h-8 shrink-0 border-primary" onClick={onCooked}>Cooked it</Button>
        ) : (
          <WantButton recipe={recipe} size="xs" className="h-8 shrink-0" />
        )}
      </div>
      <span className={cn("text-xs", info.canCook && uses ? "font-semibold" : "text-muted-foreground")}>
        {info.canCook ? uses ?? "Everything in stock" : `Short of ${shortNames(info).toLowerCase()}`}
        {info.canCook && uses && <ExpiryAlert date={info.usesUp?.date ?? null} className="ml-1.5 align-[-2px]" />}
      </span>
      <SortOutFlag recipe={recipe} info={info} />
    </div>
  )
}

function Column({ title, sub, list, dark }: { title: string; sub: string; list: Ranked[]; dark?: boolean }) {
  const [cooking, setCooking] = React.useState<Recipe | null>(null)
  return (
    <section className="flex min-w-0 flex-col gap-3" aria-label={title}>
      <div className={cn("flex items-baseline justify-between px-4 py-3", dark ? "bg-primary text-primary-foreground" : "bg-muted")}>
        <span className="flex items-baseline gap-2">
          <span className="text-xs font-semibold tracking-widest uppercase">{title}</span>
          <span className={cn("text-xs", dark ? "text-primary-foreground/70" : "text-muted-foreground")}>{sub}</span>
        </span>
        <span className="text-xs font-semibold tabular-nums">{list.length}</span>
      </div>
      {list.map((r) => <RecipeCard key={r.recipe.id} {...r} onCooked={() => setCooking(r.recipe)} />)}
      {list.length === 0 && <p className="px-1 text-xs text-muted-foreground">None right now.</p>}
      {cooking && <CookedDialog open onOpenChange={(o) => !o && setCooking(null)} recipe={cooking} serves={cooking.serves} />}
    </section>
  )
}

function UseFirst({ value, onChange }: { value: string | null; onChange: (id: string | null) => void }) {
  const { items, db } = usePantry()
  const soon = Object.values(items)
    .map((item) => ({ item, date: soonest(item), count: recipesUsing(db.recipes, item.id).length }))
    .filter((x): x is { item: Item; date: string; count: number } => !!x.date && daysUntil(x.date) <= 14 && x.count > 0)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 6)
  if (!soon.length) return null
  return (
    <div className="flex flex-col gap-2">
      <Eyebrow>Use first · pick one to see its recipes</Eyebrow>
      <div className="grid grid-cols-6 gap-3">
        {soon.map(({ item, date, count }) => {
          const on = value === item.id
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(on ? null : item.id)}
              className={cn("flex flex-col gap-1 border px-4 py-3 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50", on ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted", daysUntil(date) <= 3 && !on && "border-primary")}
            >
              <span className={cn("text-[10px] font-semibold tracking-widest uppercase", on ? "text-primary-foreground/70" : "text-muted-foreground")}>Use by {lower(dateText(date))}</span>
              <span className="text-sm"><strong className="font-semibold">{item.name}</strong>{!on && <ExpiryAlert date={date} className="ml-1 align-[-2px]" />} · {plural(count, "recipe")}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function WhatToCook({ ranked }: { ranked: Ranked[] }) {
  const [quick, setQuick] = React.useState<Quick>("all")
  const [using, setUsing] = React.useState<string | null>(null)
  const shown = ranked.filter((r) => quickTest[quick](r.recipe) && (!using || r.recipe.ingredients.some((g) => g.itemId === using)))
  const now = shown.filter((r) => r.info.canCook)
  const nearly = shown.filter((r) => !r.info.canCook && r.info.short.length <= 2)
  const shop = shown.filter((r) => r.info.short.length > 2)
  return (
    <div className="flex flex-col gap-6">
      <UseFirst value={using} onChange={setUsing} />
      <div className="flex items-center gap-4">
        <Eyebrow>Show</Eyebrow>
        <FilterChips<Quick>
          aria-label="Show"
          value={quick}
          onValueChange={setQuick}
          options={[
            { value: "all", label: "All", count: ranked.length },
            { value: "dinner", label: "Dinner", count: ranked.filter((r) => quickTest.dinner(r.recipe)).length },
            { value: "quick", label: "Under 20 min", count: ranked.filter((r) => quickTest.quick(r.recipe)).length },
            { value: "want", label: "Want to cook", count: ranked.filter((r) => quickTest.want(r.recipe)).length },
          ]}
        />
      </div>
      <div className="grid grid-cols-3 gap-5">
        <Column title="Cook now" sub="Everything is in stock" list={now} dark />
        <Column title="Nearly" sub="Short of 1 or 2 things" list={nearly} />
        <Column title="Needs a shop" sub="Short of 3 or more" list={shop} />
      </div>
    </div>
  )
}

type Show = "can" | "nearly" | "want"
type Sort = "name" | "added" | "edited"
const byName = (a: Ranked, b: Ranked) => a.recipe.name.localeCompare(b.recipe.name)
/** Newest first; a recipe with no date goes last. */
const newest = (get: (r: Recipe) => string | undefined) => (a: Ranked, b: Ranked) => (get(b.recipe) ?? "").localeCompare(get(a.recipe) ?? "") || byName(a, b)
const sorts: Record<Sort, { label: string; compare: (a: Ranked, b: Ranked) => number }> = {
  name: { label: "A–Z", compare: byName },
  added: { label: "Date added", compare: newest((r) => r.addedAt) },
  edited: { label: "Date edited", compare: newest((r) => r.editedAt) },
}
// The Recipe column stays put while the rest of the table scrolls sideways under it. Sticky cells need a solid
// background (each row state is matched below) and a line on the right edge so the scrolled columns tuck under it.
const frozen = "sticky left-0 z-10 shadow-[inset_-1px_0_0_var(--border)]"

function AllRecipes({ ranked, selected }: { ranked: Ranked[]; selected?: string }) {
  const [show, setShow] = React.useState<Show | null>(null)
  const [meal, setMeal] = React.useState<string | null>(null)
  const [time, setTime] = React.useState<string | null>(null)
  const [sort, setSort] = React.useState<Sort>("name")
  const [tags, setTags] = React.useState<string[]>([])
  const showTest: Record<Show, (r: Ranked) => boolean> = {
    can: (r) => r.info.canCook,
    nearly: (r) => !r.info.canCook && r.info.short.length <= 2,
    want: (r) => r.recipe.wantToCook,
  }
  const pass = (r: Ranked, skip?: string) =>
    (skip === "show" || !show || showTest[show](r)) && (skip === "meal" || !meal || r.recipe.meal === meal) && (skip === "time" || !time || minutesBand(r.recipe.minutes) === time) &&
    (skip === "tags" || !tags.length || (r.recipe.tags ?? []).some((t) => tags.includes(t.toLowerCase())))
  const rows = ranked.filter((r) => pass(r)).sort(sorts[sort].compare)
  const count = (skip: string, test: (r: Ranked) => boolean) => ranked.filter((r) => pass(r, skip) && test(r)).length
  return (
    <div className="flex min-h-0 flex-1">
      <FilterSidebar footer="To add a recipe, give Claude a link, a file or the text. It links each ingredient to your pantry.">
        <FilterGroup<Show>
          label="Show"
          value={show}
          onChange={setShow}
          options={[
            { value: "can", label: "Can cook now", count: count("show", showTest.can) },
            { value: "nearly", label: "Short of 1 or 2", count: count("show", showTest.nearly) },
            { value: "want", label: "Want to cook", count: count("show", showTest.want) },
          ]}
        />
        <FilterGroup
          label="Meal"
          value={meal}
          onChange={setMeal}
          options={["Breakfast", "Lunch", "Dinner", "Baking"].map((m) => ({ value: m, label: m, count: count("meal", (r) => r.recipe.meal === m) }))}
        />
        <FilterGroup
          label="Time"
          value={time}
          onChange={setTime}
          options={[
            { value: "under20", label: "Under 20 min", count: count("time", (r) => minutesBand(r.recipe.minutes) === "under20") },
            { value: "20to40", label: "20 to 40 min", count: count("time", (r) => minutesBand(r.recipe.minutes) === "20to40") },
            { value: "over40", label: "Over 40 min", count: count("time", (r) => minutesBand(r.recipe.minutes) === "over40") },
          ]}
        />
      </FilterSidebar>
      <div className="flex min-w-0 flex-1 flex-col gap-4 overflow-y-auto px-8 py-6">
        {/* Pills and sort share a row: the pills wrap onto more lines if they don't fit, the sort stays top right. */}
        <div className="flex shrink-0 items-start gap-6">
          <TagPills
            tags={commonTags(ranked.map((r) => r.recipe), 10)}
            value={tags}
            onChange={setTags}
            count={(tag) => count("tags", (r) => (r.recipe.tags ?? []).some((t) => t.toLowerCase() === tag))}
          />
          <div className="ml-auto shrink-0 py-2">
            <SortSelect value={sort} onChange={setSort} options={(Object.keys(sorts) as Sort[]).map((k) => ({ value: k, label: sorts[k].label }))} />
          </div>
        </div>
        {/* The table scrolls sideways under the frozen Recipe column with no scroll bar showing (trackpad or
            Shift + wheel). overflow-x makes the box scroll vertically too, so that's switched off. */}
        <Table containerClassName="overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {["Recipe", "Stock", "Short of", "Uses up", "Time", "Serves", "Tags", ""].map((h, k) => (
                <TableHead key={h} className={cn("h-10 text-[10px] font-semibold tracking-widest", k === 0 && cn(frozen, "bg-background pl-3"))}>{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ recipe, info }) => (
              <TableRow
                key={recipe.id}
                tabIndex={0}
                aria-label={`${recipe.name}: open in the side panel`}
                data-state={selected === recipe.id ? "selected" : undefined}
                className="group h-12 cursor-pointer outline-none focus-visible:bg-muted"
                onClick={(e) => opensPanel(e) && navigate({ name: "recipes", tab: "all", recipe: recipe.id })}
                onKeyDown={(e) => panelKey(e, () => navigate({ name: "recipes", tab: "all", recipe: recipe.id }))}
              >
                <TableCell
                  className={cn(
                    frozen,
                    "min-w-56 max-w-80 bg-background pl-3 whitespace-normal group-hover:bg-[color-mix(in_oklch,var(--muted)_50%,var(--background))] group-focus-visible:bg-muted group-data-[state=selected]:bg-muted",
                    selected === recipe.id && "shadow-[inset_2px_0_0_var(--primary),inset_-1px_0_0_var(--border)]",
                  )}
                >
                  <RecipeName recipe={recipe} tab="all" />
                </TableCell>
                <TableCell>
                  <span className="flex items-center gap-3">
                    <Badge variant={info.canCook ? "solid" : "outlined"}>{info.canCook ? "Can cook" : `Short ${info.short.length}`}</Badge>
                    <SortOutFlag recipe={recipe} info={info} />
                  </span>
                </TableCell>
                <TableCell className="max-w-48 truncate">{info.canCook ? "–" : shortNames(info, 2)}</TableCell>
                <TableCell>
                  {info.usesUp ? <span className="inline-flex items-center gap-1.5">{`${info.usesUp.item.name}, use by ${lower(dateText(info.usesUp.date))}`}<ExpiryAlert date={info.usesUp.date} /></span> : "–"}
                </TableCell>
                <TableCell className="tabular-nums">{minutesText(recipe.minutes)}</TableCell>
                <TableCell className="tabular-nums">{recipe.serves}</TableCell>
                <TableCell className="text-muted-foreground">{recipeTags(recipe).join(" · ")}</TableCell>
                <TableCell className="pr-3 text-right"><WantButton recipe={recipe} size="xs" className="h-8" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {rows.length === 0 && <p className="py-6 text-sm text-muted-foreground">No recipes match these filters.</p>}
      </div>
    </div>
  )
}

/** The recipes' tags, most used first (ties A to Z), lower case. Meals have their own filter, so they're left out. */
function commonTags(recipes: Recipe[], n: number) {
  const counts = new Map<string, number>()
  for (const r of recipes) for (const t of new Set((r.tags ?? []).map((t) => t.toLowerCase()))) counts.set(t, (counts.get(t) ?? 0) + 1)
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, n).map(([t]) => t)
}

/**
 * The most common tags as photo pills above the All recipes table. Tick several to see recipes with any of them;
 * the count is how many recipes each would show with the other filters. A tag with no photo gets a plain pill.
 */
function TagPills({ tags, value, onChange, count }: { tags: string[]; value: string[]; onChange: (v: string[]) => void; count: (tag: string) => number }) {
  if (!tags.length) return null
  return (
    <div role="group" aria-label="Tags" className="-mx-1 flex min-w-0 flex-1 flex-wrap gap-3 px-1 py-1">
      {tags.map((tag) => {
        const on = value.includes(tag)
        const photo = tagPhoto(tag)
        return (
          <button
            key={tag}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((t) => t !== tag) : [...value, tag])}
            className={cn(
              "relative flex h-12 min-w-36 shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-full px-6 outline-none",
              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              photo ? "bg-muted-foreground" : "bg-muted",
              on && "ring-2 ring-primary ring-offset-2 ring-offset-background",
            )}
          >
            {photo && <img src={photo} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />}
            {/* A dark wash so the white label reads on any photo; deeper when picked. */}
            {photo && <span className={cn("absolute inset-0 transition-colors", on ? "bg-black/55" : "bg-black/35 hover:bg-black/25")} />}
            <span className={cn("relative flex items-center gap-1.5 text-sm font-semibold capitalize", photo ? "text-white" : "text-foreground")}>
              {on && <CheckIcon className="size-4" strokeWidth={2.5} aria-hidden="true" />}
              {tag}
              <span className={cn("text-xs font-semibold tabular-nums", photo ? "text-white/90" : "text-muted-foreground")}>{count(tag)}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

function NoRecipes() {
  return (
    <div className="flex max-w-3xl flex-col gap-6 py-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-[22px] font-semibold">No recipes yet</h2>
        <p className="text-sm text-muted-foreground">
          Recipes come in through Claude. Give it a link, a file or the text, and it saves the recipe and links each ingredient to your pantry.
          It asks you when it isn't sure which item an ingredient means.
        </p>
      </div>
      <ClaudeExamples />
      <div className="flex gap-2">
        <Button onClick={() => navigate({ name: "recipes", tab: "cook", recipe: "new" })}>Add one yourself</Button>
        <Button variant="outline" onClick={() => navigate({ name: "settings", tab: "claude" })}>Set up the Claude connection</Button>
      </div>
      <p className="text-xs text-muted-foreground">Once you have recipes, this page shows what you can cook from what you have.</p>
    </div>
  )
}

export function RecipesScreen({ route }: { route: Extract<Route, { name: "recipes" }> }) {
  const { db, items } = usePantry()
  const ranked = db.recipes.map((recipe) => ({ recipe, info: recipeInfo(recipe, items) })).sort(byUseFirst)
  const canCook = ranked.filter((r) => r.info.canCook).length
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-col gap-4 px-8 pt-7">
        <PageTitle title="Recipes" subtitle={`${plural(ranked.length, "recipe")} · ${canCook} you can cook now${route.tab === "cook" ? " · what needs using first is at the top" : ""}`} />
        <Tabs value={route.tab} onValueChange={(tab) => navigate({ name: "recipes", tab: tab as "cook" | "all" })}>
          <TabsList variant="line" className="h-10 gap-6 p-0">
            <TabsTrigger value="cook" className="px-0 text-xs font-semibold tracking-widest uppercase">What to cook</TabsTrigger>
            <TabsTrigger value="all" className="px-0 text-xs font-semibold tracking-widest uppercase">All recipes {ranked.length}</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div className="flex min-h-0 flex-1 flex-col border-t border-border">
        {ranked.length === 0 ? (
          <div className="px-8"><NoRecipes /></div>
        ) : route.tab === "cook" ? (
          <div className="overflow-y-auto px-8 py-6"><WhatToCook ranked={ranked} /></div>
        ) : (
          <AllRecipes ranked={ranked} selected={route.recipe} />
        )}
      </div>
      <RecipePanel id={route.recipe} tab={route.tab} edit={route.edit} serves={route.serves} onClose={() => navigate({ name: "recipes", tab: route.tab })} />
    </div>
  )
}

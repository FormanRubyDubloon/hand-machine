// REC-07 (What to cook), REC-08 (All recipes) and REC-15 (no recipes yet).
import * as React from "react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FilterChips } from "@/components/ui/filter-chips"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  byUseFirst, dateText, daysUntil, lower, minutesBand, plural, recipeInfo, recipesUsing, recipeTags, shortNames, soonest, usesUpText,
  type Item, type Recipe, type RecipeInfo,
} from "../model"
import { navigate, type Route } from "../router"
import { usePantry } from "../state"
import { Eyebrow, FilterGroup, FilterSidebar, PageTitle } from "../components"
import { ClaudeExamples } from "./claude"
import { CookedDialog, RecipePanel, WantButton } from "./recipe"

type Quick = "all" | "dinner" | "quick" | "want"
const quickTest: Record<Quick, (r: Recipe) => boolean> = {
  all: () => true,
  dinner: (r) => r.meal === "Dinner",
  quick: (r) => r.minutes < 20,
  want: (r) => r.wantToCook,
}

type Ranked = { recipe: Recipe; info: RecipeInfo }

function RecipeCard({ recipe, info, onCooked }: Ranked & { onCooked: () => void }) {
  const uses = usesUpText(info.usesUp)
  return (
    <div className={cn("flex flex-col gap-2 border bg-background p-4", info.canCook && info.usesUp ? "border-primary" : "border-border")}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <button type="button" className="text-left text-[15px] leading-tight font-semibold hover:underline" onClick={() => navigate({ name: "recipes", tab: "cook", recipe: recipe.id })}>
            {recipe.name}
          </button>
          <span className="text-xs text-muted-foreground">{[`${recipe.minutes} min`, `Serves ${recipe.serves}`, ...recipeTags(recipe)].join(" · ")}</span>
        </div>
        {info.canCook ? (
          <Button size="xs" variant="outline" className="h-8 shrink-0 border-primary" onClick={onCooked}>Cooked it</Button>
        ) : (
          <WantButton recipe={recipe} size="xs" className="h-8 shrink-0" />
        )}
      </div>
      <span className={cn("text-xs", info.canCook && uses ? "font-semibold" : "text-muted-foreground")}>
        {info.canCook ? uses ?? "Everything in stock" : `Short of ${shortNames(info).toLowerCase()}`}
      </span>
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
              <span className="text-sm"><strong className="font-semibold">{item.name}</strong> · {plural(count, "recipe")}</span>
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
function AllRecipes({ ranked }: { ranked: Ranked[] }) {
  const [show, setShow] = React.useState<Show | null>(null)
  const [meal, setMeal] = React.useState<string | null>(null)
  const [time, setTime] = React.useState<string | null>(null)
  const showTest: Record<Show, (r: Ranked) => boolean> = {
    can: (r) => r.info.canCook,
    nearly: (r) => !r.info.canCook && r.info.short.length <= 2,
    want: (r) => r.recipe.wantToCook,
  }
  const pass = (r: Ranked, skip?: string) =>
    (skip === "show" || !show || showTest[show](r)) && (skip === "meal" || !meal || r.recipe.meal === meal) && (skip === "time" || !time || minutesBand(r.recipe.minutes) === time)
  const rows = ranked.filter((r) => pass(r))
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
      <div className="min-w-0 flex-1 overflow-y-auto px-8 py-6">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {["Recipe", "Stock", "Short of", "Uses up", "Time", "Serves", "Tags", ""].map((h) => (
                <TableHead key={h} className="h-10 text-[10px] font-semibold tracking-widest">{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ recipe, info }) => (
              <TableRow key={recipe.id} className="h-12">
                <TableCell className="pl-3">
                  <button type="button" className="text-left text-[15px] font-semibold hover:underline" onClick={() => navigate({ name: "recipes", tab: "all", recipe: recipe.id })}>
                    {recipe.name}
                  </button>
                </TableCell>
                <TableCell><Badge variant={info.canCook ? "solid" : "outlined"}>{info.canCook ? "Can cook" : `Short ${info.short.length}`}</Badge></TableCell>
                <TableCell className="max-w-48 truncate">{info.canCook ? "–" : shortNames(info, 2)}</TableCell>
                <TableCell>{info.usesUp ? `${info.usesUp.item.name}, use by ${lower(dateText(info.usesUp.date))}` : "–"}</TableCell>
                <TableCell className="tabular-nums">{recipe.minutes} min</TableCell>
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
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-col gap-4 px-8 pt-7">
        <PageTitle title="Recipes" subtitle={`${plural(ranked.length, "recipe")} · ${canCook} you can cook now · what needs using first is at the top`} />
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
          <AllRecipes ranked={ranked} />
        )}
      </div>
      <RecipePanel id={route.recipe} edit={route.edit} onClose={() => navigate({ name: "recipes", tab: route.tab })} />
    </div>
  )
}

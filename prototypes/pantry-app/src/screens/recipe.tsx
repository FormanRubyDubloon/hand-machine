// REC-09 (side panel), REC-10 (full screen), REC-11 (cooked it), REC-12 (pack-size warning),
// REC-13 (want to cook, a toast) and REC-14 (delete recipe).
import * as React from "react"
import { CheckIcon, Maximize2Icon, Minimize2Icon, PencilIcon, Trash2Icon, ArrowLeftIcon } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  dateText, haveText, isBulk, lower, measureText, nameList, plural, shortfall, recipeInfo, recipesUsing, recipeTags, shortDate, unitText, unitWord,
  withStock, type IngredientRow, type Recipe,
} from "../model"
import { navigate } from "../router"
import { usePantry } from "../state"
import { Eyebrow, SidePanel, Stepper, StockMark } from "../components"
import { RecipeEditor } from "./recipe-edit"

// ---------- want to cook ----------

/** Puts what's short on the list and shows REC-13 as a toast with Undo. */
export function useWantToCook() {
  const { items, actions } = usePantry()
  return (recipe: Recipe, factor = 1) => {
    const info = recipeInfo(recipe, items, factor)
    const rows = info.short
      .filter((r) => r.item && r.status !== "listed")
      .map((r) => ({
        itemId: r.item!.id,
        qty: r.status === "little" && r.item!.packSize ? Math.max(1, Math.ceil((r.required! - r.capacity!) / r.item!.packSize.amount)) : Math.max(1, r.missing),
      }))
    const entryId = actions.wantToCook(recipe, rows)
    const names = rows.map((r) => `${items[r.itemId].name} (${unitText(items[r.itemId], r.qty)})`)
    toast(rows.length ? `Added ${plural(rows.length, "thing")} to your shopping list` : `Saved ${recipe.name} to your phone`, {
      description: rows.length
        ? `${nameList(names)}, marked "For ${recipe.name}". The recipe is saved to your phone so you can read it in the shop without signal.`
        : "Nothing to buy: it's all in stock or already on the list. You can read it in the shop without signal.",
      action: { label: "Undo", onClick: () => actions.undo(entryId) },
      cancel: { label: "See the list", onClick: () => navigate({ name: "list" }) },
      duration: 8000,
    })
  }
}

export function WantButton({ recipe, factor = 1, size = "default", className }: { recipe: Recipe; factor?: number; size?: "default" | "sm" | "xs"; className?: string }) {
  const want = useWantToCook()
  const { actions } = usePantry()
  if (recipe.wantToCook)
    return (
      <Button size={size} className={className} onClick={() => actions.unwant(recipe)} title="On the list. Click to take its items off.">
        <CheckIcon />
        On the list
      </Button>
    )
  return (
    <Button size={size} variant="outline" className={cn("border-primary", className)} onClick={() => want(recipe, factor)}>
      Want to cook
    </Button>
  )
}

// ---------- shared body ----------

const metaLine = (r: Recipe) =>
  [
    r.prep !== undefined ? `Prep ${r.prep} min` : null,
    r.cook ? `Cook ${r.cook} min` : null,
    r.lastCooked ? `Cooked ${dateText(r.lastCooked) === "Today" ? "today" : shortDate(r.lastCooked)}` : "Never cooked",
    r.addedBy ? `Added by ${r.addedBy === "claude" ? "Claude" : "you"}${r.addedAt ? `, ${shortDate(r.addedAt)}` : ""}` : null,
  ]
    .filter(Boolean)
    .join(" · ")

function stockLine(r: IngredientRow) {
  if (!r.item) return "Not in your pantry"
  return r.item.inStock ? `have ${haveText(r.item, ", ")}` : "none in stock"
}

function IngredientLine({ row, factor, onAddPack }: { row: IngredientRow; factor: number; onAddPack: () => void }) {
  const short = row.status === "short" || row.status === "little" || row.status === "unlinked"
  return (
    <div className={cn("flex flex-col gap-2 border-b border-border px-3 py-3", short && "bg-muted")}>
      <div className="flex items-center gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className={cn("text-[15px] leading-snug", short ? "font-semibold" : "font-medium")}>{row.text}</span>
          <span className="text-xs text-muted-foreground">
            {row.item && (
              <>
                <a className="underline underline-offset-4" href={`#/pantry/${row.item.id}`}>{row.item.name}</a>
                {row.item.packSize ? ` (${measureText(row.item.packSize.amount, row.item.packSize.measure)} ${row.item.unit?.[0] ?? "pack"})` : ""} ·{" "}
              </>
            )}
            {stockLine(row)}
          </span>
        </div>
        <StockMark status={row.status} missing={row.missing} />
      </div>
      {row.status === "little" && row.item?.packSize && (
        <div className="flex items-center justify-between gap-4 pl-0">
          <span className="text-xs">
            Needs {measureText(row.required!, row.item.packSize.measure)}{factor !== 1 ? "" : ""}. You have {unitText(row.item, row.item.inStock)}, which{" "}
            {row.item.inStock === 1 ? "holds" : "hold"} {measureText(row.capacity!, row.item.packSize.measure)} at most{row.item.open ? `, and ${row.item.inStock === 1 ? "it's" : "one's"} open` : ""}.
          </span>
          <Button size="xs" variant="outline" className="h-8 shrink-0 border-primary bg-background" onClick={onAddPack}>
            Add 1 {row.item.unit?.[0] ?? "pack"} to the list
          </Button>
        </div>
      )}
    </div>
  )
}

/** The servings-scaled recipe: summary, ingredients against stock, method and notes. */
export function RecipeBody({ recipe, serves, setServes, columns }: { recipe: Recipe; serves: number; setServes: (n: number) => void; columns?: boolean }) {
  const { items, actions } = usePantry()
  const factor = serves / recipe.serves
  const info = recipeInfo(recipe, items, factor)
  const listed = info.rows.filter((r) => r.status === "listed")
  const little = info.rows.filter((r) => r.status === "little")
  const truelyShort = info.rows.filter((r) => r.status === "short")

  const summary =
    factor !== 1 && (little.length || info.short.length) ? (
      <>
        At {serves} servings you're {info.short.length ? `short of ${plural(info.short.length, "thing")}` : "fine"}
        {little.length ? `, and the ${nameList(little.map((r) => lower(r.item!.name)))} ${little.length === 1 ? "needs" : "need"} more than your ${little.length === 1 ? "pack holds" : "packs hold"}` : ""}.
      </>
    ) : info.canCook ? (
      <>You have everything.</>
    ) : (
      <>
        You have {info.have} of {info.rows.length}.{" "}
        {listed.length > 0 && <>{nameList(listed.map((r, k) => (k ? lower(r.item!.name) : r.item!.name)))} {listed.length === 1 ? "is" : "are"} on your shopping list. </>}
        {truelyShort.length > 0 && <>Short of {nameList(truelyShort.map((r) => lower(r.item?.name ?? r.text)))}.</>}
      </>
    )

  const ingredients = (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Eyebrow className="text-foreground">Ingredients · {info.rows.length}</Eyebrow>
        <div className="flex items-center gap-3">
          <Eyebrow>Serves</Eyebrow>
          <Stepper size="sm" label="Servings" value={serves} min={1} max={24} onChange={setServes} />
        </div>
      </div>
      <div className="flex flex-col border-t border-border">
        {info.rows.map((row, k) => (
          <IngredientLine
            key={k}
            row={row}
            factor={factor}
            onAddPack={() => row.item && actions.addToList(row.item.id, 1, false)}
          />
        ))}
      </div>
      {info.rows.some((r) => r.status === "some") && <span className="text-xs text-muted-foreground">A light tick means there's an open pack. The app doesn't measure what's left in it.</span>}
    </section>
  )

  const method = (
    <section className="flex flex-col gap-3">
      <Eyebrow className="text-foreground">Method</Eyebrow>
      <ol className="flex flex-col gap-4">
        {recipe.method.map((step, k) => (
          <li key={k} className="flex gap-4">
            <span className="flex size-7 shrink-0 items-center justify-center border border-primary text-xs font-semibold">{k + 1}</span>
            <span className="text-[15px] leading-relaxed">{step}</span>
          </li>
        ))}
      </ol>
      {recipe.notes && (
        <div className="mt-2 flex flex-col gap-1 border-l-2 border-primary pl-4">
          <Eyebrow>My notes</Eyebrow>
          <span className="text-sm">{recipe.notes}</span>
        </div>
      )}
    </section>
  )

  return (
    <div className="flex flex-col gap-7">
      <div className="flex items-center justify-between gap-4 border border-border bg-muted px-4 py-3">
        <span className="text-sm">{summary}</span>
        {factor !== 1 ? (
          <Button size="xs" variant="outline" className="h-8 shrink-0 border-primary bg-background" onClick={() => setServes(recipe.serves)}>
            Back to {recipe.serves} servings
          </Button>
        ) : listed.length > 0 ? (
          <Button size="xs" variant="outline" className="h-8 shrink-0 border-primary bg-background" onClick={() => navigate({ name: "list" })}>
            See the list
          </Button>
        ) : null}
      </div>
      {columns ? (
        <div className="grid grid-cols-[1fr_1.1fr] gap-12">
          {ingredients}
          {method}
        </div>
      ) : (
        <>
          {ingredients}
          {method}
        </>
      )}
    </div>
  )
}

// ---------- REC-09 side panel ----------

export function RecipePanel({ id, edit, onClose }: { id?: string; edit?: boolean; onClose: () => void }) {
  const { db } = usePantry()
  const recipe = id ? db.recipes.find((r) => r.id === id) : undefined
  const [serves, setServes] = React.useState(recipe?.serves ?? 2)
  const [cooked, setCooked] = React.useState(false)
  const [remove, setRemove] = React.useState(false)
  const [last, setLast] = React.useState(id)
  if (id !== last) {
    setLast(id)
    setServes(recipe?.serves ?? 2)
  }
  if (id === "new" || (recipe && edit)) return <RecipeEditor recipe={recipe} onClose={() => (recipe ? navigate({ name: "recipes", tab: "cook", recipe: recipe.id }, { replace: true }) : onClose())} onCancel={onClose} />
  return (
    <>
      <SidePanel
        open={!!recipe}
        onClose={onClose}
        width={800}
        eyebrow={recipe ? recipeTags(recipe).join(" · ") : undefined}
        title={recipe?.name}
        description={recipe ? metaLine(recipe) : undefined}
        headerActions={
          recipe && (
            <Button variant="outline" size="icon-sm" aria-label="Full screen" title="Full screen" onClick={() => navigate({ name: "recipe-full", id: recipe.id })}>
              <Maximize2Icon />
            </Button>
          )
        }
        footer={
          recipe && (
            <>
              <Button variant="outline" onClick={() => navigate({ name: "recipes", tab: "cook", recipe: recipe.id, edit: true })}>
                <PencilIcon />
                Edit
              </Button>
              <Button variant="destructive" onClick={() => setRemove(true)}>Delete</Button>
              <span className="flex-1" />
              <Button variant="outline" className="border-primary" onClick={() => setCooked(true)}>Cooked it</Button>
              <WantButton recipe={recipe} factor={serves / recipe.serves} />
            </>
          )
        }
      >
        {recipe && <RecipeBody recipe={recipe} serves={serves} setServes={setServes} />}
      </SidePanel>
      {recipe && <CookedDialog open={cooked} onOpenChange={setCooked} recipe={recipe} serves={serves} />}
      {recipe && <DeleteRecipeDialog open={remove} onOpenChange={setRemove} recipe={recipe} onDone={onClose} />}
    </>
  )
}

// ---------- REC-10 full screen ----------

export function RecipeFull({ id }: { id: string }) {
  const { db } = usePantry()
  const recipe = db.recipes.find((r) => r.id === id)
  const [serves, setServes] = React.useState(recipe?.serves ?? 2)
  const [cooked, setCooked] = React.useState(false)
  const [remove, setRemove] = React.useState(false)
  if (!recipe) {
    return (
      <div className="p-8">
        <p className="text-sm">That recipe isn't here any more.</p>
        <a className="text-sm underline" href="#/recipes/cook">Back to recipes</a>
      </div>
    )
  }
  const facts: [string, React.ReactNode][] = [
    ["Prep", recipe.prep !== undefined ? `${recipe.prep} min` : "–"],
    ["Cook", recipe.cook ? `${recipe.cook} min` : "–"],
    ["Serves", String(recipe.serves)],
    ["Last cooked", recipe.lastCooked ? shortDate(recipe.lastCooked) : "Never"],
    [
      "Source",
      <>
        <span className="block truncate" title={recipe.source}>{recipe.source ?? "–"}</span>
        {recipe.addedBy && <span className="block">Added by {recipe.addedBy === "claude" ? "Claude" : "you"}{recipe.addedAt ? ` ${shortDate(recipe.addedAt)}` : ""}</span>}
      </>,
    ],
  ]
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-12 py-8">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-8">
        <Button variant="link" className="h-auto self-start p-0 text-xs" onClick={() => navigate({ name: "recipes", tab: "cook" })}>
          <ArrowLeftIcon />
          Recipes · What to cook
        </Button>
        <div className="flex items-start justify-between gap-6">
          <div className="flex flex-col gap-2">
            <Eyebrow>{recipeTags(recipe).join(" · ")}</Eyebrow>
            <h1 className="text-[40px] leading-none font-semibold tracking-[0.02em] uppercase">{recipe.name}</h1>
          </div>
          <div className="flex shrink-0 gap-2">
            <WantButton recipe={recipe} factor={serves / recipe.serves} />
            <Button variant="outline" className="border-primary" onClick={() => setCooked(true)}>Cooked it</Button>
            <Button variant="outline" onClick={() => navigate({ name: "recipes", tab: "cook", recipe: recipe.id, edit: true })}>
              <PencilIcon />
              Edit
            </Button>
            <Button variant="outline" size="icon" aria-label="Back to the side panel" title="Back to the side panel" onClick={() => navigate({ name: "recipes", tab: "cook", recipe: recipe.id })}>
              <Minimize2Icon />
            </Button>
            <Button variant="outline" size="icon" aria-label="Delete recipe" title="Delete recipe" onClick={() => setRemove(true)}>
              <Trash2Icon />
            </Button>
          </div>
        </div>
        <dl className="grid grid-cols-5 border-y border-border">
          {facts.map(([k, v]) => (
            <div key={k} className="flex min-w-0 flex-col gap-1 border-r border-border px-4 py-3 last:border-r-0">
              <dt><Eyebrow>{k}</Eyebrow></dt>
              <dd className="text-sm font-semibold">{v}</dd>
            </div>
          ))}
        </dl>
        <RecipeBody recipe={recipe} serves={serves} setServes={setServes} columns />
      </div>
      <CookedDialog open={cooked} onOpenChange={setCooked} recipe={recipe} serves={serves} />
      <DeleteRecipeDialog open={remove} onOpenChange={setRemove} recipe={recipe} onDone={() => navigate({ name: "recipes", tab: "cook" })} />
    </div>
  )
}

// ---------- REC-11 cooked it ----------

export function CookedDialog({ open, onOpenChange, recipe, serves: initial }: { open: boolean; onOpenChange: (o: boolean) => void; recipe: Recipe; serves: number }) {
  const { items, actions } = usePantry()
  const [serves, setServes] = React.useState(initial)
  const [counts, setCounts] = React.useState<Record<string, number>>({})
  const [finished, setFinished] = React.useState<Record<string, boolean>>({})
  const [wasOpen, setWasOpen] = React.useState(false)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setServes(initial)
      setCounts({})
      setFinished({})
    }
  }
  const info = recipeInfo(recipe, items, serves / recipe.serves)
  const inStock = info.rows.filter((r) => r.item && r.item.inStock > 0)
  // Counted and used whole (2 tins of sardines) get a number. Bulk, or part of a unit, get "Finished it".
  const counted = inStock.filter((r) => !isBulk(r.item!) && !r.ing.partial)
  const packs = inStock.filter((r) => isBulk(r.item!) || r.ing.partial)
  const countOf = (r: IngredientRow) => counts[r.item!.id] ?? Math.min(r.need, r.item!.inStock)

  const usedCounts = Object.fromEntries(counted.map((r) => [r.item!.id, countOf(r)]))
  const usedPacks = packs.filter((r) => finished[r.item!.id]).map((r) => r.item!.id)
  const changes = [
    ...counted.filter((r) => countOf(r) > 0).map((r) => `${r.item!.name} −${countOf(r)}`),
    ...usedPacks.map((id) => `${items[id].name} finished`),
  ]
  const drops = [
    ...counted.filter((r) => countOf(r) > 0).map((r) => withStock(r.item!, r.item!.inStock - countOf(r))),
    ...usedPacks.map((id) => withStock(items[id], items[id].inStock - 1)),
  ].filter((i) => i.target > 0 && shortfall(items[i.id]) === 0 && shortfall(i) > 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] gap-5 overflow-y-auto p-8 sm:max-w-[720px]">
        <DialogHeader>
          <Eyebrow>Cooked it</Eyebrow>
          <DialogTitle className="text-[22px] tracking-[0.04em] uppercase">{recipe.name}</DialogTitle>
          <DialogDescription>Check what you used. Nothing changes until you press Update stock.</DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-between border-y border-border py-3">
          <span className="text-sm font-semibold">You cooked it for</span>
          <div className="flex items-center gap-3">
            <Eyebrow>Serves</Eyebrow>
            <Stepper size="sm" label="Servings" value={serves} min={1} max={24} onChange={(n) => { setServes(n); setCounts({}) }} />
          </div>
        </div>
        {counted.length > 0 && (
          <section className="flex flex-col">
            <Eyebrow className="pb-2">Counted · filled in from the recipe</Eyebrow>
            {counted.map((r) => {
              const n = countOf(r)
              return (
                <div key={r.item!.id} className="flex items-center gap-4 border-b border-border py-3">
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="text-sm font-semibold">{r.item!.name}</span>
                    <span className="text-xs text-muted-foreground">
                      Recipe says {unitText(r.item!, r.need)} · you have {r.item!.inStock}, so {Math.max(0, r.item!.inStock - n)} left
                    </span>
                  </div>
                  <Stepper size="sm" label={`${r.item!.name} used`} value={n} max={r.item!.inStock} onChange={(v) => setCounts({ ...counts, [r.item!.id]: v })} />
                  <span className="w-14 text-xs text-muted-foreground">{unitWord(r.item!, n)}</span>
                </div>
              )
            })}
            <span className="pt-2 text-xs text-muted-foreground">Change a number if you used more or less.</span>
          </section>
        )}
        {packs.length > 0 && (
          <section className="flex flex-col">
            <Eyebrow className="pb-2">Packs and part-used · tick one you finished</Eyebrow>
            {packs.map((r) => (
              <label key={r.item!.id} className="flex cursor-pointer items-center gap-4 border-b border-border py-3">
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="text-sm font-semibold">{r.item!.name}</span>
                  <span className="text-xs text-muted-foreground">{haveText(r.item!, ", ")}</span>
                </div>
                <span className="text-xs font-semibold tracking-widest uppercase">Finished it</span>
                <Checkbox checked={!!finished[r.item!.id]} onCheckedChange={(c) => setFinished({ ...finished, [r.item!.id]: !!c })} aria-label={`Finished the ${r.item!.name.toLowerCase()}`} />
              </label>
            ))}
            <span className="pt-2 text-xs text-muted-foreground">Ticking takes one off stock. Leave it if there's some left.</span>
          </section>
        )}
        <div className="flex flex-col gap-1 border border-border bg-muted p-4 text-sm">
          <span>
            {changes.length ? `${plural(changes.length, "change")}: ${changes.join(", ")}.` : "No stock changes."}{" "}
            {drops.length > 0 && `${nameList(drops.map((d) => d.name))} ${drops.length === 1 ? "drops" : "drop"} below ${drops.length === 1 ? "its" : "their"} minimum, so ${drops.length === 1 ? "it goes" : "they go"} on the shopping list.`}
          </span>
          <span className="text-xs text-muted-foreground">Also marks {recipe.name} as cooked today{recipe.wantToCook ? " and takes it off Want to cook" : ""}.</span>
        </div>
        <DialogFooter className="sm:justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => { actions.cooked(recipe, usedCounts, usedPacks); onOpenChange(false) }}>Update stock</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------- REC-14 delete ----------

export function DeleteRecipeDialog({ open, onOpenChange, recipe, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; recipe: Recipe; onDone: () => void }) {
  const { items, db, actions } = usePantry()
  const [offList, setOffList] = React.useState(true)
  const linked = [...new Set(recipe.ingredients.map((g) => g.itemId).filter((id) => id && items[id]))].map((id) => items[id])
  const onlyHere = linked.filter((i) => i.target === 0 && recipesUsing(db.recipes, i.id).length === 1)
  const listed = linked.filter((i) => i.entries?.some((e) => e.source.kind === "recipe" && e.source.recipe === recipe.name))
  const names = (list: typeof linked) => nameList(list.map((i, k) => (k ? i.name : i.name)))
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-5 p-8 sm:max-w-[560px]">
        <DialogHeader>
          <Eyebrow>Delete recipe</Eyebrow>
          <DialogTitle className="text-[22px] tracking-[0.04em] uppercase">Delete {recipe.name}?</DialogTitle>
          <DialogDescription className="text-sm text-foreground">This deletes the recipe, its method and your notes. The pantry items it uses stay.</DialogDescription>
        </DialogHeader>
        {onlyHere.length > 0 && (
          <p className="text-sm">
            {names(onlyHere)} {onlyHere.length === 1 ? "was" : "were"} probably created for this recipe and {onlyHere.length === 1 ? "isn't" : "aren't"} used by any other. {onlyHere.length === 1 ? "It stays" : "They stay"} in the pantry with a minimum of 0.
          </p>
        )}
        {listed.length > 0 && (
          <label className="flex cursor-pointer items-start gap-3 border border-border bg-muted p-4">
            <Checkbox checked={offList} onCheckedChange={(c) => setOffList(!!c)} className="mt-0.5" />
            <span className="flex flex-col gap-1">
              <span className="text-sm font-semibold">Also take {names(listed)} off the shopping list</span>
              <span className="text-xs text-muted-foreground">{listed.length === 1 ? "It's" : "They're"} on the list only because you marked this recipe Want to cook.</span>
            </span>
          </label>
        )}
        <p className="text-[13px] text-muted-foreground">You can undo this from History today.</p>
        <DialogFooter className="sm:justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="bg-destructive text-white hover:bg-destructive/80" onClick={() => { actions.deleteRecipe(recipe, listed.length > 0 && offList); onOpenChange(false); onDone() }}>
            Delete recipe
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

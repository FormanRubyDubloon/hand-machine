// REC-10 full-screen recipe, layout A "To buy first" (handoff 17 November 2026, Claude Docs).
// Ingredients are grouped into To buy, In stock and Optional, and every row has an Add button that is
// always visible. The side panel (REC-09) and the edit view (REC-16) are unchanged.
import * as React from "react"
import { ArrowLeftIcon, CheckIcon, CircleIcon, MinusIcon, Minimize2Icon, PencilIcon, PlusIcon, ShoppingBasketIcon, Trash2Icon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  categoriesAtoZ, dateText, locations, guessPlace, ingredientName, inStockText, isBulk, lower, measureText, needOf, recipeInfo, recipeQty, shortDate, unitText,
  type IngredientRow, type Item, type Recipe,
} from "../model"
import { href, navigate, type RecipesTab } from "../router"
import { usePantry } from "../state"
import { Eyebrow, ExpiryAlert, Field, Stepper } from "../components"
import { RecipeEditor } from "./recipe-edit"
import { ItemPanel, pluralise } from "./item-panel"
import { CookedDialog, DeleteRecipeDialog, WantButton, useRecipeList } from "./recipe"

const MAX_SERVES = 12

// ---------- words ----------

type Group = "buy" | "stock" | "optional"

/** Which group a row goes in. A row stays put when it goes on the list: only stock and servings move it. */
function groupOf(row: IngredientRow): Group {
  if (row.ing.optional) return "optional"
  return row.status === "have" || row.status === "some" ? "stock" : "buy"
}

/** Line 2's stock text: "7 tins in stock", "7 tins in stock, this needs 8", "3 bottles in stock, 1 open". */
function stockText(row: IngredientRow) {
  const i = row.item
  if (!i) return row.status === "have" ? "Always to hand" : "Not in your pantry yet"
  if (i.inStock === 0) return "none in stock"
  if (!isBulk(i) && !row.ing.partial && i.inStock < row.need) return `${unitText(i, i.inStock)} in stock, this needs ${row.need}`
  return inStockText(i, ", ")
}

/** The amount at the start of the wording ("200 g", "2 cloves"), or the whole wording when there's no number. */
function amountIn(text: string) {
  const m = text.match(/^(?:about |roughly )?[\d½¼¾⅓⅔./-]+\s*(?:kg|g|ml|l|tsp|tbsp|cloves?|tins?|jars?|cans?|bunch(?:es)?|packs?|bags?|slices?|fillets?|handfuls?|pinch(?:es)?)?\b/i)
  return m ? m[0].trim() : text
}
const noteFor = (recipe: Recipe, row: IngredientRow) => `${recipe.name}: ${amountIn(row.text)}`

/** "pack" and "packs", or the item's own unit. */
const unitName = (i: Item | undefined, n: number) => (i?.unit ? (n === 1 ? i.unit[0] : i.unit[1]) : n === 1 ? "pack" : "packs")

// ---------- small pieces ----------

function StatusIcon({ row }: { row: IngredientRow }) {
  const name = row.status === "have" ? "Have it" : row.status === "some" ? "Have some" : "Not in stock"
  return (
    <span role="img" aria-label={name} title={name} className="flex size-6 shrink-0 items-center justify-center">
      {row.status === "have" ? (
        <CheckIcon strokeWidth={2.5} className="size-4 text-foreground" />
      ) : row.status === "some" ? (
        <CheckIcon strokeWidth={2.5} className="size-4 text-muted-foreground" />
      ) : (
        <CircleIcon strokeWidth={2} className="size-4 text-muted-foreground" />
      )}
    </span>
  )
}

/** The servings stepper: 32px square buttons and a 16px number. */
function ServesStepper({ value, onChange, max }: { value: number; onChange: (n: number) => void; max: number }) {
  return (
    <div role="group" aria-label="Servings" className="inline-flex items-center gap-1">
      <Button variant="outline" className="size-8 p-0" aria-label="Fewer servings" disabled={value <= 1} onClick={() => onChange(value - 1)}>
        <MinusIcon className="size-3.5" />
      </Button>
      <span className="w-8 text-center text-base font-semibold tabular-nums" aria-live="polite">{value}</span>
      <Button variant="outline" className="size-8 p-0" aria-label="More servings" disabled={value >= max} onClick={() => onChange(value + 1)}>
        <PlusIcon className="size-3.5" />
      </Button>
    </div>
  )
}

/**
 * How many are on the shopping list: 36px high, accent border on the surface colour, the count with its unit.
 * Minus at `min` takes the ingredient off the list when `canRemove`.
 */
function ListStepper({
  name, value, unit, min, onChange, plusRef,
}: { name: string; value: number; unit: (n: number) => string; min: number; onChange: (n: number) => void; plusRef?: React.Ref<HTMLButtonElement> }) {
  const removes = value <= 1 && min === 0
  return (
    <div role="group" aria-label={`${name} on the shopping list`} className="inline-flex h-9 items-center border border-primary bg-muted">
      <Button
        variant="ghost"
        className="h-full w-9 rounded-none p-0 hover:bg-background"
        aria-label={removes ? `Take ${name} off the list` : `One less ${unit(1)}`}
        disabled={value <= Math.max(min, 1) && !removes}
        onClick={() => onChange(value - 1)}
      >
        <MinusIcon className="size-3.5" />
      </Button>
      <span className="min-w-[76px] px-1 text-center text-sm font-semibold tabular-nums" aria-live="polite">
        {value} {unit(value)}
      </span>
      <Button ref={plusRef} variant="ghost" className="h-full w-9 rounded-none p-0 hover:bg-background" aria-label={`One more ${unit(1)}`} onClick={() => onChange(value + 1)}>
        <PlusIcon className="size-3.5" />
      </Button>
    </div>
  )
}

/** A 36px icon button with a tooltip on hover and keyboard focus. Filled accent, or quiet outline. */
const IconButton = React.forwardRef<HTMLButtonElement, { tip: string; label: string; onClick: () => void; quiet?: boolean; children: React.ReactNode }>(
  function IconButton({ tip, label, onClick, quiet, children }, ref) {
    return (
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              ref={ref}
              size="icon-sm"
              variant={quiet ? "outline" : "default"}
              className={cn("[&_svg]:size-[18px]", quiet && "border-(--line-strong) bg-transparent hover:bg-muted focus-visible:bg-muted")}
              aria-label={label}
              onClick={onClick}
            >
              {children}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">{tip}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  },
)

/**
 * "I already have this". For an ingredient the pantry doesn't know: name, how many and aisle, and it becomes a
 * pantry item linked to the recipe (location guessed, marked New for review). For one it knows: just how many.
 */
function HaveDialog({
  recipe, row, position, onClose, onFull,
}: { recipe: Recipe; row: IngredientRow; position: number; onClose: (saved: boolean) => void; onFull: (seed: Partial<Item>) => void }) {
  const { items, db, actions } = usePantry()
  const linked = !!row.item
  const [name, setName] = React.useState(() => ingredientName(row.ing.text))
  const [qty, setQty] = React.useState(() => Math.max(1, row.need))
  const [categoryId, setCategoryId] = React.useState(() => guessPlace(ingredientName(row.ing.text), items).categoryId)
  const [unitName_, setUnit] = React.useState("")
  const [location, setLocation] = React.useState<NonNullable<Item["location"]>>(() => guessPlace(ingredientName(row.ing.text), items).location ?? "cupboard")
  const [tried, setTried] = React.useState(false)
  const ok = linked || (name.trim() && categoryId)
  const typedUnit = unitName_.trim()
  const nameInput = React.useRef<HTMLInputElement>(null)
  const save = () => {
    setTried(true)
    if (!ok) return
    if (row.item) actions.setStock(row.item.id, qty)
    else actions.haveNewIngredient(recipe, position, { name, qty, categoryId, location, unit: typedUnit ? [typedUnit, pluralise(typedUnit)] : undefined })
    onClose(true)
  }
  const unit = (n: number) => (row.item?.unit ? (n === 1 ? row.item.unit[0] : row.item.unit[1]) : "")
  return (
    <Dialog open onOpenChange={(o) => !o && onClose(false)}>
      <DialogContent
        className="gap-5 p-8 sm:max-w-[440px]"
        // Open with the guessed name selected, so typing replaces it and Enter keeps it.
        onOpenAutoFocus={(e) => {
          if (!nameInput.current) return
          e.preventDefault()
          nameInput.current.focus()
          nameInput.current.select()
        }}
      >
        <DialogHeader>
          <Eyebrow>{row.text}</Eyebrow>
          <DialogTitle className="text-[22px] tracking-[0.04em] uppercase">{linked ? `How much ${lower(row.item!.name)} do you have?` : "Add it to your pantry"}</DialogTitle>
          <DialogDescription>
            {linked
              ? "This sets the stock to what you have, and the recipe counts it as in stock."
              : "It goes in your pantry with what you have, linked to this recipe. Fill in the rest from the item later."}
          </DialogDescription>
        </DialogHeader>
        <form className="flex min-w-0 flex-col gap-5" onSubmit={(e) => { e.preventDefault(); save() }}>
          {!linked && (
            <Field label="Name">
              <Input ref={nameInput} value={name} onChange={(e) => setName(e.target.value)} aria-invalid={tried && !name.trim()} />
            </Field>
          )}
          <div className={cn("grid items-start gap-5", !linked && "grid-cols-[auto_1fr]")}>
            <div className="flex flex-col gap-2">
              <Eyebrow>How many</Eyebrow>
              <div className="flex items-center gap-3">
                <Stepper size="md" label="How many" value={qty} min={1} onChange={setQty} />
                {unit(qty) && <span className="text-sm text-muted-foreground">{unit(qty)}</span>}
              </div>
            </div>
            {!linked && (
              <Field label="Unit" hint="Optional: tin, jar, bag. Leave blank to count them.">
                <Input value={unitName_} placeholder="tin" onChange={(e) => setUnit(e.target.value)} />
              </Field>
            )}
          </div>
          {!linked && (
            <div className="flex flex-col gap-2">
              <Eyebrow>Aisle</Eyebrow>
              <Select value={categoryId || undefined} onValueChange={setCategoryId}>
                <SelectTrigger className="w-full" aria-label="Aisle" aria-invalid={tried && !categoryId}>
                  <SelectValue placeholder="Choose an aisle" />
                </SelectTrigger>
                <SelectContent>
                  {categoriesAtoZ(db.categories).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {tried && !categoryId && <span className="text-xs text-destructive">Choose an aisle.</span>}
            </div>
          )}
          {!linked && (
            <div className="flex flex-col gap-2">
              <Eyebrow>Location</Eyebrow>
              <Select value={location} onValueChange={(l) => setLocation(l as NonNullable<Item["location"]>)}>
                <SelectTrigger className="w-full" aria-label="Location">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          {!linked && (
            <button
              type="button"
              className="self-start text-xs underline underline-offset-4 hover:text-foreground text-muted-foreground"
              onClick={() =>
                onFull({
                  name: name.trim() || ingredientName(row.ing.text), inStock: qty, useBy: Array(qty).fill(null), categoryId, location,
                  unit: typedUnit ? [typedUnit, pluralise(typedUnit)] : undefined,
                })
              }
            >
              More details? Open the full Add item
            </button>
          )}
          <DialogFooter className="sm:justify-between">
            <Button type="button" variant="outline" onClick={() => onClose(false)}>Cancel</Button>
            <Button type="submit">{linked ? "Update stock" : "Add to pantry"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ---------- a row ----------

type Focus = { position: number; on: "plus" | "add" } | null

function Row({
  row, recipe, tab, position, serves, group, focus, onAdd, onHave, onSetMine, onSetTotal,
}: {
  row: IngredientRow
  recipe: Recipe
  tab: RecipesTab
  position: number
  serves: number
  group: Group
  focus: Focus
  onAdd: () => void
  onHave: () => void
  onSetMine: (n: number) => void
  onSetTotal: (n: number) => void
}) {
  const plus = React.useRef<HTMLButtonElement>(null)
  const add = React.useRef<HTMLButtonElement>(null)
  const mine = recipeQty(row, recipe)
  // On the list for another reason (a Staple below its minimum, another recipe, added by hand).
  const elsewhere = mine === 0 && !!row.item && needOf(row.item) > 0
  // Water is always to hand: nothing to add.
  const canAdd = !!row.item || row.status === "unlinked"
  const name = lower(row.item?.name ?? ingredientName(row.text))
  const buy = group === "buy"
  // Only rows you don't have can be marked as had: everything in To buy, and optional ones not in stock.
  const canHave = buy || (group === "optional" && row.status !== "have" && row.status !== "some")

  React.useEffect(() => {
    if (focus?.position !== position) return
    ;(focus.on === "plus" ? plus : add).current?.focus()
  }, [focus, position, mine])

  const control = mine > 0 ? (
    <ListStepper name={name} value={mine} unit={(n) => unitName(row.item, n)} min={0} onChange={onSetMine} plusRef={plus} />
  ) : elsewhere ? (
    <ListStepper name={name} value={needOf(row.item!)} unit={(n) => unitName(row.item, n)} min={1} onChange={onSetTotal} plusRef={plus} />
  ) : canAdd ? (
    <div className="flex items-center gap-2">
      {canHave && (
        <IconButton tip="I already have this" label={`I already have ${name}`} onClick={onHave} quiet>
          <CheckIcon />
        </IconButton>
      )}
      <IconButton ref={add} tip="Add to shopping list" label={`Add 1 ${unitName(row.item, 1)} of ${name} to the shopping list`} onClick={onAdd} quiet={!buy}>
        <ShoppingBasketIcon />
      </IconButton>
    </div>
  ) : null

  const warning = row.status === "little" && row.item?.packSize && mine === 0 && (
    <span className="text-xs font-semibold text-destructive">
      Needs {measureText(row.required!, row.item.packSize.measure)}. You have {unitText(row.item, row.item.inStock)}, which{" "}
      {row.item.inStock === 1 ? "holds" : "hold"} {measureText(row.capacity!, row.item.packSize.measure)} at most
      {row.item.open ? `, and ${row.item.inStock === 1 ? "it's" : "one's"} open` : ""}.
    </span>
  )

  return (
    <li className={cn("flex items-center gap-3", buy ? "min-h-16 border-t border-border py-2 pr-3 pl-4 first:border-t-0" : "min-h-14 border-b border-border py-2")}>
      {!buy && <StatusIcon row={row} />}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={cn("text-[15px] leading-snug", buy ? "font-semibold" : "font-normal")}>
          {row.text}
          {row.ing.optional && !/\boptional\b/i.test(row.text) && <span className="font-serif text-muted-foreground italic"> (optional)</span>}
        </span>
        <span className="text-xs text-muted-foreground">
          {row.item && (
            <>
              <a className="underline underline-offset-4 hover:text-foreground" href={href({ name: "recipe-full", id: recipe.id, tab, item: row.item.id, serves })}>{row.item.name}</a>
              <ExpiryAlert item={row.item} className="ml-1 align-[-2px]" />
              {" · "}
            </>
          )}
          {stockText(row)}
        </span>
        {mine > 0 && <span className="text-xs">On your list, noted “{noteFor(recipe, row)}”</span>}
        {elsewhere && <span className="text-xs">On your list already, not from this recipe</span>}
        {warning}
      </div>
      {control && <div className="flex shrink-0 items-center">{control}</div>}
    </li>
  )
}

function GroupHeader({ id, label, count, hint }: { id: string; label: string; count: number; hint: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-(--line-strong) pb-2">
      <h3 id={id} tabIndex={-1} className="outline-none text-[10px] font-semibold tracking-widest text-foreground uppercase">{label} · {count}</h3>
      <span className="text-xs text-muted-foreground">{hint}</span>
    </div>
  )
}

// ---------- ingredients column ----------

function Ingredients({ recipe, tab, serves, setServes }: { recipe: Recipe; tab: RecipesTab; serves: number; setServes: (n: number) => void }) {
  const { items, actions } = usePantry()
  const factor = serves / recipe.serves
  const info = recipeInfo(recipe, items, factor)
  const list = useRecipeList(recipe)
  const [focus, setFocus] = React.useState<Focus>(null)
  const [having, setHaving] = React.useState<number | null>(null)
  const haveButton = React.useRef<HTMLElement | null>(null)
  // The full Add item panel, opened from the mini dialog. Saving it links the new item to the recipe line.
  const [full, setFull] = React.useState<{ position: number; seed: Partial<Item> } | null>(null)
  const fullSaved = React.useRef(false)

  const rows = info.rows.map((row, position) => ({ row, position, group: groupOf(row) }))
  const buy = rows.filter((r) => r.group === "buy")
  const stock = rows.filter((r) => r.group === "stock")
  const optional = rows.filter((r) => r.group === "optional")
  const listed = (row: IngredientRow) => recipeQty(row, recipe) > 0 || (!!row.item && needOf(row.item) > 0)
  const buyListed = buy.filter((r) => listed(r.row)).length
  const toAdd = buy.filter((r) => !listed(r.row) && (r.row.item || r.row.status === "unlinked")).map((r) => r.position)

  const row = (r: (typeof rows)[number]) => (
    <Row
      key={r.position}
      row={r.row}
      recipe={recipe}
      tab={tab}
      position={r.position}
      serves={serves}
      group={r.group}
      focus={focus}
      onAdd={() => {
        list.add([r.position])
        if (r.row.item) setFocus({ position: r.position, on: "plus" })
      }}
      onHave={() => {
        haveButton.current = document.activeElement as HTMLElement | null
        setHaving(r.position)
      }}
      onSetMine={(n) => {
        if (!r.row.item) return
        actions.setIngredientQty(recipe, r.row.item.id, n)
        if (n < 1) setFocus({ position: r.position, on: "add" })
      }}
      onSetTotal={(n) => r.row.item && actions.setListQty(r.row.item.id, n)}
    />
  )

  return (
    <section aria-labelledby="ingredients-heading" className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-6">
        <div className="flex flex-col gap-1">
          <h2 id="ingredients-heading"><Eyebrow className="text-foreground">Ingredients · {info.rows.length}</Eyebrow></h2>
          {info.rows.length > 0 && (
            <p className="font-serif text-xl leading-[26px]">You have {info.have} of the {info.needed} it needs.</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Eyebrow>Serves</Eyebrow>
          <ServesStepper value={serves} onChange={setServes} max={Math.max(MAX_SERVES, recipe.serves)} />
        </div>
      </div>

      {info.rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No ingredients yet. Use Edit to add them.</p>
      ) : (
        <>
          {buy.length > 0 ? (
            <div className="overflow-hidden rounded-(--radius) border border-primary">
              <div className="flex items-center justify-between gap-4 bg-muted px-4 py-3">
                <div className="flex flex-col gap-0.5">
                  <h3 id="to-buy" className="text-[10px] font-semibold tracking-widest text-foreground uppercase">To buy · {buy.length}</h3>
                  <span className="text-xs text-foreground">
                    {buyListed === 0 ? "None on your shopping list yet" : buyListed === buy.length ? "All on your shopping list" : `${buyListed} of ${buy.length} on your shopping list`}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant={toAdd.length ? "default" : "secondary"}
                  disabled={!toAdd.length}
                  onClick={() => list.add(toAdd)}
                  className="disabled:opacity-100 disabled:text-muted-foreground"
                >
                  {!toAdd.length ? "All added" : buyListed === 0 ? "Add all" : `Add the other ${toAdd.length}`}
                </Button>
              </div>
              <ul aria-labelledby="to-buy" className="flex flex-col border-t border-primary">{buy.map(row)}</ul>
            </div>
          ) : (
            <div className="rounded-(--radius) bg-muted px-4 py-4 text-sm">Nothing to buy. You have everything this recipe needs.</div>
          )}

          <div className="flex flex-col">
            <GroupHeader id="in-stock" label="In stock" count={stock.length} hint="Add any of these if you want a spare" />
            <ul aria-labelledby="in-stock" className="flex flex-col">{stock.map(row)}</ul>
          </div>

          {optional.length > 0 && (
            <div className="flex flex-col">
              <GroupHeader id="optional" label="Optional" count={optional.length} hint="The recipe works without these" />
              <ul aria-labelledby="optional" className="flex flex-col">{optional.map(row)}</ul>
            </div>
          )}

          {info.rows.some((r) => r.status === "some") && (
            <span className="text-xs text-muted-foreground">A lighter tick means you have some: an open pack or a part-used item. The app doesn't measure what's left.</span>
          )}
        </>
      )}
      {list.dialog}
      {having !== null && info.rows[having] && (
        <HaveDialog
          recipe={recipe}
          row={info.rows[having]}
          position={having}
          onFull={(seed) => {
            setFull({ position: having, seed })
            setHaving(null)
          }}
          onClose={(saved) => {
            setHaving(null)
            // Cancel: back to the button. Saved: the row has moved to In stock and its
            // button is gone, so land on that group rather than the top of the page.
            const back = saved ? document.getElementById("in-stock") : haveButton.current
            setTimeout(() => back?.focus(), 0)
          }}
        />
      )}
      {full && (
        <ItemPanel
          id="new"
          prefill={full.seed.name}
          seed={full.seed}
          onSaved={(itemId) => {
            fullSaved.current = true
            actions.linkIngredient(recipe, full.position, itemId)
          }}
          onClose={() => {
            setFull(null)
            const back = fullSaved.current ? document.getElementById("in-stock") : haveButton.current
            fullSaved.current = false
            setTimeout(() => back?.focus(), 0)
          }}
        />
      )}
    </section>
  )
}

// ---------- the page ----------

function MetaLine({ recipe }: { recipe: Recipe }) {
  const parts: React.ReactNode[] = [
    recipe.prep ? `Prep ${recipe.prep} min` : null,
    recipe.cook ? `Cook ${recipe.cook} min` : null,
    recipe.lastCooked ? `Cooked ${dateText(recipe.lastCooked) === "Today" ? "today" : shortDate(recipe.lastCooked)}` : "Never cooked",
  ]
  const added = recipe.addedBy ? `added by ${recipe.addedBy === "claude" ? "Claude" : "you"}${recipe.addedAt ? ` ${shortDate(recipe.addedAt)}` : ""}` : null
  if (recipe.source) {
    const isLink = /^https?:\/\//.test(recipe.source)
    parts.push(
      <>
        From{" "}
        {isLink ? <a className="underline underline-offset-4 hover:text-foreground" href={recipe.source} target="_blank" rel="noreferrer">{new URL(recipe.source).hostname.replace(/^www\./, "")}</a> : recipe.source}
        {added ? `, ${added}` : ""}
      </>,
    )
  } else if (added) parts.push(added[0].toUpperCase() + added.slice(1))
  const shown = parts.filter(Boolean)
  return (
    <p className="text-[13px] leading-[18px] text-muted-foreground">
      {shown.map((p, k) => <React.Fragment key={k}>{k > 0 && " · "}{p}</React.Fragment>)}
    </p>
  )
}

function Method({ recipe }: { recipe: Recipe }) {
  return (
    <section aria-labelledby="method-heading" className="flex min-w-0 flex-col gap-3">
      <h2 id="method-heading"><Eyebrow className="text-foreground">Method</Eyebrow></h2>
      <ol className="flex flex-col gap-4">
        {recipe.method.map((step, k) => (
          <li key={k} className="flex gap-4">
            <span className="flex size-7 shrink-0 items-center justify-center border border-primary text-xs font-semibold">{k + 1}</span>
            <span className="type-lead text-[15px] leading-relaxed">{step}</span>
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
}

export function RecipeFull({ id, tab = "cook", item, serves: initial }: { id: string; tab?: RecipesTab; item?: string; serves?: number }) {
  const { db } = usePantry()
  const recipe = db.recipes.find((r) => r.id === id)
  const [serves, setServes] = React.useState(initial ?? recipe?.serves ?? 2)
  const [cooked, setCooked] = React.useState(false)
  const [remove, setRemove] = React.useState(false)
  const [editing, setEditing] = React.useState(false)
  const editButton = React.useRef<HTMLButtonElement>(null)
  const closeEditor = () => {
    setEditing(false)
    // The sheet hands focus back on its own close, but this one wasn't opened by a trigger.
    setTimeout(() => editButton.current?.focus(), 0)
  }
  if (!recipe) {
    return (
      <div className="p-8">
        <p className="text-sm">That recipe isn't here any more.</p>
        <a className="text-sm underline" href="#/recipes/cook">Back to recipes</a>
      </div>
    )
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-8 pt-7 pb-8">
      <div className="@container mx-auto flex w-full max-w-[1120px] flex-col gap-6">
        <a
          href={href({ name: "recipes", tab })}
          className="inline-flex items-center gap-1.5 self-start text-xs font-semibold tracking-[0.1em] uppercase underline underline-offset-4"
          onClick={(e) => { e.preventDefault(); navigate({ name: "recipes", tab }) }}
        >
          <ArrowLeftIcon className="size-3.5" />
          Recipes · {tab === "all" ? "All recipes" : "What to cook"}
        </a>
        <div className="flex items-start justify-between gap-6">
          <div className="flex min-w-0 flex-col gap-2.5">
            <h1 className="font-serif text-[40px] leading-[1.05] font-bold tracking-[0.02em] uppercase">{recipe.name}</h1>
            <MetaLine recipe={recipe} />
          </div>
          <div className="flex shrink-0 gap-2">
            <WantButton recipe={recipe} filled />
            <Button variant="outline" className="border-primary" onClick={() => setCooked(true)}>Cooked it</Button>
            <Button ref={editButton} variant="outline" onClick={() => setEditing(true)}>
              <PencilIcon />
              Edit
            </Button>
            <Button variant="outline" size="icon" aria-label="Back to the side panel" title="Back to the side panel" onClick={() => navigate({ name: "recipes", tab, recipe: recipe.id, serves })}>
              <Minimize2Icon />
            </Button>
            <Button variant="outline" size="icon" aria-label="Delete recipe" title="Delete recipe" onClick={() => setRemove(true)}>
              <Trash2Icon />
            </Button>
          </div>
        </div>
        <div className="grid gap-x-14 gap-y-10 border-t border-border pt-6 @min-[976px]:grid-cols-[560px_minmax(360px,1fr)] @min-[976px]:items-start">
          <Ingredients recipe={recipe} tab={tab} serves={serves} setServes={setServes} />
          <Method recipe={recipe} />
        </div>
      </div>
      <CookedDialog open={cooked} onOpenChange={setCooked} recipe={recipe} serves={serves} />
      <DeleteRecipeDialog open={remove} onOpenChange={setRemove} recipe={recipe} onDone={() => navigate({ name: "recipes", tab })} />
      <ItemPanel id={item} onClose={() => navigate({ name: "recipe-full", id: recipe.id, tab, serves })} />
      {editing && <RecipeEditor recipe={recipe} onClose={closeEditor} onCancel={closeEditor} />}
    </div>
  )
}

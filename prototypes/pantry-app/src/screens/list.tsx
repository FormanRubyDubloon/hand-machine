// LIST-01 (the list in aisle order), LIST-05 (add to list) and LIST-06 (nothing to buy).
// The same list the phone shows. Changes here reach the phone at its next sync.
import * as React from "react"
import { CheckIcon, PlusIcon, SearchIcon, SmartphoneIcon, XIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { FilterChips } from "@/components/ui/filter-chips"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  aisleOrder, cap, containsText, fullOf, haveText, inStockText, isBulk, isStaple, isToday, listRows, listTotal, locationLabel, money, namesOf, needOf, numberedAisles,
  plural, soldAt, stockOf, timeText, shortDate, unitWord, type Category, type ListRow, type Reason, categoriesAtoZ,
} from "../model"
import { navigate, type Route } from "../router"
import { usePantry } from "../state"
import { CategoryLabel, CategoryMark } from "../category-look"
import { Eyebrow, PageTitle, Segmented, SidePanel, Stepper, StockPill, TagPill } from "../components"

type Group = "all" | ListRow["group"]

function Why({ row }: { row: ListRow }) {
  const { actions, db } = usePantry()
  const recipeId = (name: string) => db.recipes.find((r) => r.name === name)?.id ?? name
  const i = row.item
  const parts = row.reasons.map((r: Reason, k) => {
    switch (r.kind) {
      case "staple":
        return (
          <span key={k} className="flex items-center gap-2">
            <StockPill item={i} />
            <span>Staple · {cap(inStockText(i))} · {i.target} min</span>
          </span>
        )
      case "recipe":
        return (
          <span key={k} className="flex items-center gap-2">
            <TagPill>Recipe</TagPill>
            <span>For <a className="underline underline-offset-4" href={`#/recipes/cook/${encodeURIComponent(recipeId(r.recipe))}`}>{r.recipe}</a> · Want to cook</span>
          </span>
        )
      case "claude":
        return (
          <span key={k} className="flex items-center gap-2">
            <TagPill>Claude</TagPill>
            <span>Added by Claude{r.at && isToday(r.at) ? ` today, ${timeText(r.at)}` : ""}</span>
          </span>
        )
      case "hand":
        return (
          <span key={k} className="flex items-center gap-2">
            <TagPill>Added</TagPill>
            <span>Added by you{i.oneOff ? " · one-off" : ""}</span>
          </span>
        )
    }
  })
  const claudeOnly = row.reasons.length === 1 && row.reasons[0].kind === "claude"
  return (
    <div className="flex flex-col gap-1 text-[13px]">
      {parts}
      {claudeOnly && (
        <button type="button" className="self-start text-xs underline underline-offset-4" onClick={() => actions.removeFromList(i.id)}>
          Undo
        </button>
      )}
    </div>
  )
}

function NothingToBuy() {
  const { items } = usePantry()
  const staples = Object.values(items).filter(isStaple)
  const next = staples
    .filter((i) => fullOf(i) === i.target || (isBulk(i) && (i.open ?? 0) > 0))
    .slice(0, 5)
  return (
    <div className="flex max-w-2xl flex-col gap-8 py-6">
      <div className="flex flex-col gap-2">
        <h2 className="flex items-center gap-3 text-[22px] font-semibold"><CheckIcon className="size-6" />Everything's stocked</h2>
        <p className="text-sm text-muted-foreground">
          All {plural(staples.length, "Staple")} are at or above their minimum. When one drops below, it goes on the list by itself. Recipes you mark Want to cook add what you're short of.
        </p>
        <div className="flex gap-2 pt-2">
          <Button onClick={() => navigate({ name: "list", add: true })}><PlusIcon />Add to list</Button>
          <Button variant="outline" onClick={() => navigate({ name: "recipes", tab: "cook" })}>Find something to cook</Button>
        </div>
      </div>
      {next.length > 0 && (
        <section className="flex flex-col">
          <Eyebrow className="pb-2">Next to run low</Eyebrow>
          {next.map((i) => (
            <div key={i.id} className="flex items-baseline justify-between border-b border-border py-3 text-sm">
              <span className="font-semibold">{i.name}</span>
              <span className="text-muted-foreground">{haveText(i)} left, minimum {i.target}</span>
            </div>
          ))}
        </section>
      )}
    </div>
  )
}

export function ListScreen({ route }: { route: Extract<Route, { name: "list" }> }) {
  const { items, db, actions, phoneSyncedAt, store: defaultStore } = usePantry()
  const [group, setGroup] = React.useState<Group>("all")
  const [stock, setStock] = React.useState<"all" | "low" | "out">("all")
  const [storeId, setStoreId] = React.useState(defaultStore?.id)
  const store = db.stores.find((s) => s.id === storeId) ?? defaultStore

  const rows = listRows(items)
  const inGroup = rows.filter((r) => group === "all" || r.group === group)
  const shown = inGroup.filter((r) => stock === "all" || stockOf(r.item) === stock)
  const total = listTotal(rows)
  const counts = { staples: rows.filter((r) => r.group === "staples").length, recipes: rows.filter((r) => r.group === "recipes").length, added: rows.filter((r) => r.group === "added").length }

  // Group by aisle in this store's walking order. Things it doesn't sell go at the end.
  const aisles = store ? aisleOrder(store, db.categories) : categoriesAtoZ(db.categories)
  const groups = [
    ...aisles.map((c) => ({ key: c.id, name: c.name, category: c as Category | undefined, number: store?.aisles[c.id] ?? null, rows: shown.filter((r) => r.item.categoryId === c.id && (!store || soldAt(r.item, store))) })),
    { key: "elsewhere", category: undefined, name: store ? `Not at ${store.name.split(",")[0]}` : "Other", number: null, rows: shown.filter((r) => !store || !soldAt(r.item, store)) },
  ].filter((g) => g.rows.length)

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex min-w-0 flex-1 flex-col gap-5 overflow-y-auto px-8 py-7">
        <PageTitle
          title="Shopping list"
          subtitle={rows.length ? `${plural(rows.length, "item")}, in aisle order for ${store?.name ?? "your store"}. Change an amount here and it updates on your phone at its next sync.` : "Nothing to buy right now."}
        >
          {rows.length > 0 && (
            <div className="flex w-full items-center justify-between gap-3">
            <FilterChips<Group>
              aria-label="Show"
              value={group}
              onValueChange={setGroup}
              options={[
                { value: "all", label: "All", count: rows.length },
                { value: "staples", label: "Staples", count: counts.staples },
                { value: "recipes", label: "For recipes", count: counts.recipes },
                { value: "added", label: "Added", count: counts.added },
              ]}
            />
            {/* The same control as the Pantry page; counts follow the Show choice. */}
            <Segmented
              label="Stock"
              className="w-auto"
              value={stock}
              onChange={setStock}
              options={[
                { value: "all", label: `All ${inGroup.length}` },
                { value: "low", label: `Low ${inGroup.filter((r) => stockOf(r.item) === "low").length}` },
                { value: "out", label: `Out ${inGroup.filter((r) => stockOf(r.item) === "out").length}` },
              ]}
            />
            </div>
          )}
        </PageTitle>

        {rows.length === 0 ? (
          <NothingToBuy />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {/* The table's own wrapper is what scrolls here (the filters and title stay put), so the headers stick at its top. */}
                {["Item", "To buy", "Why it's on the list", "Estimate", ""].map((h) => (
                  <TableHead key={h} className={cn("sticky top-0 z-10 h-10 bg-background text-[10px] font-semibold tracking-widest shadow-[inset_0_-1px_0_var(--border)]", h === "Estimate" && "text-right")}>{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((g) => (
                <React.Fragment key={g.key}>
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={5} className="border-b border-primary pt-5 pb-1.5 pl-3">
                      <span className="flex items-center gap-2"><CategoryMark category={g.category} size="sm" /><Eyebrow>{g.name} · {plural(g.rows.length, "item")}{g.number !== null ? ` (Aisle ${g.number})` : ""}</Eyebrow></span>
                    </TableCell>
                  </TableRow>
                  {g.rows.map((r) => (
                    <TableRow key={r.item.id} className="h-14">
                      <TableCell className="pl-3">
                        {r.item.oneOff ? (
                          <span className="text-[15px] font-semibold">{r.item.name}</span>
                        ) : (
                          <button type="button" className="text-left text-[15px] font-semibold hover:underline" onClick={() => navigate({ name: "pantry", item: r.item.id })}>
                            {r.item.name}
                          </button>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Stepper size="sm" label={`${r.item.name} to buy`} value={r.qty} min={1} onChange={(n) => actions.setListQty(r.item.id, n)} />
                          <span className="text-muted-foreground">{unitWord(r.item, r.qty)}</span>
                        </div>
                      </TableCell>
                      <TableCell><Why row={r} /></TableCell>
                      <TableCell className="text-right tabular-nums" title={r.item.price ? (r.item.priceEstimate ? "Estimated price" : undefined) : "No price"}>{r.item.price ? `${r.item.priceEstimate ? "≈" : ""}${money(r.item.price * r.qty)}` : "–"}</TableCell>
                      <TableCell className="w-12 pr-3 text-right">
                        {r.group !== "staples" && (
                          <Button variant="ghost" size="icon-xs" aria-label={`Take ${r.item.name} off the list`} title="Take off the list" onClick={() => actions.removeFromList(r.item.id)}>
                            <XIcon />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        )}
        {rows.length > 0 && shown.length === 0 && (
          <p className="text-sm text-muted-foreground">Nothing here is {stock === "out" ? "out of stock" : "low"}.</p>
        )}
      </div>

      <aside className="flex w-[340px] shrink-0 flex-col gap-7 overflow-y-auto border-l border-border bg-muted/50 px-6 py-7">
        <div className="flex flex-col gap-1">
          <Eyebrow>Estimated total</Eyebrow>
          <span className="text-[44px] leading-none font-semibold tabular-nums">
            {total.approximate && <span aria-label="about">≈</span>}
            {money(total.pence)}
          </span>
          <span className="text-xs text-muted-foreground">
            {[
              plural(rows.length, "item"),
              total.unpriced ? `${total.unpriced} without a price, not counted` : "",
              total.estimated ? plural(total.estimated, "estimated price") : "",
              !total.approximate ? "prices from your pantry" : "",
            ].filter(Boolean).join(" · ")}
          </span>
        </div>
        <div className="flex flex-col text-sm">
          {[
            ["Staples below minimum", counts.staples],
            ["For recipes you want to cook", counts.recipes],
            ["Added by you or Claude", counts.added],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between border-b border-border py-2.5">
              <span>{k}</span>
              <span className="font-semibold tabular-nums">{v}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          <Eyebrow>Shop at</Eyebrow>
          {db.stores.map((s) => {
            const here = rows.filter((r) => soldAt(r.item, s)).length
            const on = s.id === store?.id
            return (
              <button
                key={s.id}
                type="button"
                aria-pressed={on}
                onClick={() => setStoreId(s.id)}
                className={cn("flex items-center justify-between gap-3 border px-4 py-3 text-left text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50", on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:bg-muted")}
              >
                <span className="font-semibold">{s.name}</span>
                <span className={cn("shrink-0 text-xs", on ? "text-primary-foreground/70" : "text-muted-foreground")}>{plural(here, "item")} · {numberedAisles(s) > 1 ? "aisles set" : "no aisles"}</span>
              </button>
            )
          })}
          <span className="text-xs text-muted-foreground">Sets the aisle order of this list. The phone picks its own store when you start a shop.</span>
        </div>
        <div className="mt-auto flex flex-col gap-3">
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <SmartphoneIcon className="size-3.5" />
            On your phone. Last synced {isToday(phoneSyncedAt) ? "today" : shortDate(phoneSyncedAt)}, {timeText(phoneSyncedAt)}
          </span>
          <Button variant="outline" className="border-primary bg-background" onClick={() => navigate({ name: "list", add: true })}>
            <PlusIcon />
            Add to list
          </Button>
        </div>
      </aside>

      <AddToList open={!!route.add} onClose={() => navigate({ name: "list" })} />
    </div>
  )
}

// ---------- LIST-05 ----------

function AddToList({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { items, db, actions } = usePantry()
  const [query, setQuery] = React.useState("")
  const [selected, setSelected] = React.useState<string | null>(null)
  const [qty, setQty] = React.useState(1)
  const [staple, setStaple] = React.useState(false)
  const q = query.trim()
  const matches = q ? Object.values(items).filter((i) => !i.oneOff && namesOf(i).some((n) => containsText(n, q))).slice(0, 8) : []
  const item = selected ? items[selected] : undefined
  const reset = () => {
    setQuery("")
    setSelected(null)
    setQty(1)
    setStaple(false)
  }
  const add = (again: boolean) => {
    if (!item) return
    actions.addToList(item.id, qty, staple)
    reset()
    if (!again) onClose()
  }
  return (
    <SidePanel
      open={open}
      onClose={() => { reset(); onClose() }}
      width={520}
      eyebrow="Shopping list"
      title="Add to list"
      footer={
        <>
          <Button variant="outline" onClick={() => { reset(); onClose() }}>Cancel</Button>
          <span className="flex-1" />
          <Button variant="outline" className="border-primary" disabled={!item} onClick={() => add(true)}>Add and start another</Button>
          <Button disabled={!item} onClick={() => add(false)}>{item ? `Add ${item.unit ? `${qty} ${unitWord(item, qty)}` : qty} of ${item.name.toLowerCase()}` : "Add"}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        <label className="flex h-12 items-center gap-3 border-b border-foreground">
          <SearchIcon className="size-4 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelected(null) }}
            placeholder="Search the pantry"
            aria-label="Search the pantry"
            className="min-w-0 flex-1 bg-transparent text-lg outline-none placeholder:text-muted-foreground"
          />
        </label>
        {q && (
          <section className="flex flex-col">
            <Eyebrow className="pb-2">In your pantry</Eyebrow>
            {matches.length === 0 && <p className="text-sm text-muted-foreground">Nothing called "{q}".</p>}
            {matches.map((i) => {
              const listed = needOf(i) > 0
              const on = selected === i.id
              return (
                <div key={i.id} className={cn("flex flex-col border-b border-border", on && "bg-muted")}>
                  <button type="button" disabled={listed} onClick={() => { setSelected(i.id); setQty(1); setStaple(false) }} className="flex items-center justify-between gap-3 px-3 py-3 text-left disabled:opacity-60">
                    <span className="flex flex-col">
                      <span className="text-sm font-semibold">{i.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {[locationLabel(i.location), i.type, inStockText(i), isStaple(i) ? `${i.target} min` : "not a Staple"].join(" · ")}
                      </span>
                    </span>
                    <Eyebrow className="text-foreground">{listed ? "Already on the list" : on ? "Selected" : ""}</Eyebrow>
                  </button>
                  {on && (
                    <div className="flex flex-col gap-4 px-3 pb-4">
                      <div className="flex items-center gap-6">
                        <div className="flex flex-col gap-1">
                          <Eyebrow>How many</Eyebrow>
                          <Stepper size="md" label="How many" value={qty} min={1} onChange={setQty} />
                        </div>
                        <div className="flex flex-col gap-1">
                          <Eyebrow>Unit</Eyebrow>
                          <span className="text-sm">{unitWord(i, qty) || "each"}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <Eyebrow>Aisle</Eyebrow>
                          <CategoryLabel category={db.categories.find((c) => c.id === i.categoryId)} className="text-sm" />
                        </div>
                      </div>
                      {!isStaple(i) && (
                        <label className="flex cursor-pointer items-center gap-3 text-sm">
                          <Checkbox checked={staple} onCheckedChange={(c) => setStaple(!!c)} />
                          Make {i.name} a Staple and keep {i.inStock + qty} in stock
                        </label>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </section>
        )}
        {q && (
          <section className="flex flex-col">
            <Eyebrow className="pb-2">Not in your pantry</Eyebrow>
            <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-3">
              <span className="flex flex-col">
                <span className="text-sm font-semibold">Add "{q}" as a one-off</span>
                <span className="text-xs text-muted-foreground">Goes on this list only. Stock isn't tracked.</span>
              </span>
              <Button size="xs" variant="outline" className="h-8 border-primary" onClick={() => { actions.addOneOff(q); reset(); onClose() }}>Add</Button>
            </div>
            <button type="button" className="flex flex-col border-b border-border px-3 py-3 text-left hover:bg-muted" onClick={() => { reset(); navigate({ name: "pantry", item: "new", prefill: q }) }}>
              <span className="text-sm font-semibold">Create a pantry item called "{q}"</span>
              <span className="text-xs text-muted-foreground">Opens Add item</span>
            </button>
          </section>
        )}
        {!q && <p className="text-sm text-muted-foreground">Search for something in your pantry, or type anything to add it as a one-off.</p>}
      </div>
    </SidePanel>
  )
}

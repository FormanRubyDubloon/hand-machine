// PAN-10: every item in one table, filters down the left, steppers change stock in place.
// Clicking a name opens the item panel (PAN-11, PAN-16), "Add item" opens it empty (PAN-12).
import * as React from "react"
import { UploadIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  daysUntil, dateText, haveText, isBulk, isStaple, locationLabel, locations, money, needOf, plural, shortfall, soonest, stockOf, unitWord,
  type Item, type Location, categoriesAtoZ,
} from "../model"
import { navigate, type Route } from "../router"
import { usePantry } from "../state"
import { CategoryLabel, CategoryMark } from "../category-look"
import { ExpiryAlert, FilterGroup, FilterSidebar, HeadingTip, NewPill, PageTitle, Segmented, SortSelect, Stepper, StockPill, statusHelp } from "../components"
import { ItemPanel } from "./item-panel"

type Show = "staples" | "not" | "soon"
type Stock = "all" | "low" | "out"
type Filters = { location: "all" | Location; show: Show | null; type: "counted" | "bulk" | null; aisle: string | null; stock: Stock }

const showTests: Record<Show, (i: Item) => boolean> = {
  staples: isStaple,
  not: (i) => !isStaple(i),
  soon: (i) => { const d = soonest(i); return !!d && daysUntil(d) <= 3 },
}
const showLabels: Record<Show, string> = { staples: "Staples", not: "Not Staples", soon: "Use within 3 days" }

function matches(i: Item, f: Filters, skip?: keyof Filters) {
  if (skip !== "location" && f.location !== "all" && i.location !== f.location) return false
  if (skip !== "show" && f.show && !showTests[f.show](i)) return false
  if (skip !== "type" && f.type && i.type !== f.type) return false
  if (skip !== "aisle" && f.aisle && i.categoryId !== f.aisle) return false
  if (skip !== "stock" && f.stock !== "all" && stockOf(i) !== f.stock) return false
  return true
}

type Sort = "useBy" | "name" | "added" | "edited"

const byName = (a: Item, b: Item) => a.name.localeCompare(b.name)
/** Newest first; an item with no date goes last. */
const newest = (get: (i: Item) => string | undefined) => (a: Item, b: Item) => (get(b) ?? "").localeCompare(get(a) ?? "") || byName(a, b)

const sorts: Record<Sort, { label: string; summary: string; compare: (a: Item, b: Item) => number }> = {
  // Soonest use-by first; nothing in stock goes last.
  useBy: { label: "Use by date", summary: "use-by date", compare: (a, b) => (soonest(a) ?? "9999").localeCompare(soonest(b) ?? "9999") || byName(a, b) },
  name: { label: "A–Z", summary: "A–Z", compare: byName },
  added: { label: "Date added", summary: "date added, newest first", compare: newest((i) => i.addedAt) },
  edited: { label: "Date edited", summary: "date edited, newest first", compare: newest((i) => i.editedAt) },
}

export function PantryScreen({ route }: { route: Extract<Route, { name: "pantry" }> }) {
  const { items, db, actions } = usePantry()
  const [sort, setSort] = React.useState<Sort>("name")
  const [f, setF] = React.useState<Filters>({ location: "all", show: null, type: null, aisle: null, stock: "all" })
  const all = Object.values(items).filter((i) => !i.oneOff)
  const rows = all.filter((i) => matches(i, f)).sort(sorts[sort].compare)
  const count = (k: keyof Filters, test: (i: Item) => boolean) => all.filter((i) => matches(i, f, k) && test(i)).length
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => setF({ ...f, [k]: v })
  const category = (id: string) => db.categories.find((c) => c.id === id)?.name ?? "–"

  const title = [f.show ? showLabels[f.show] : f.type ? (f.type === "bulk" ? "Bulk items" : "Counted items") : f.aisle ? category(f.aisle) : "All items", f.location !== "all" ? `in the ${locationLabel(f.location).toLowerCase()}` : ""].join(" ")
  const staples = rows.filter(isStaple).length
  const below = rows.filter((i) => isStaple(i) && shortfall(i) > 0).length

  return (
    <div className="flex min-h-0 flex-1">
      <FilterSidebar>
        <FilterGroup
          label="Location"
          required
          value={f.location}
          onChange={(v) => set("location", v ?? "all")}
          options={[{ value: "all" as const, label: "All", count: count("location", () => true) }, ...locations.map((l) => ({ value: l.value, label: l.label, count: count("location", (i) => i.location === l.value) }))]}
        />
        <FilterGroup
          label="Show"
          value={f.show}
          onChange={(v) => set("show", v)}
          options={(Object.keys(showLabels) as Show[]).map((k) => ({ value: k, label: showLabels[k], count: count("show", showTests[k]) }))}
        />
        <FilterGroup
          label="Type"
          value={f.type}
          onChange={(v) => set("type", v)}
          options={[
            { value: "counted" as const, label: "Counted", count: count("type", (i) => i.type === "counted") },
            { value: "bulk" as const, label: "Bulk", count: count("type", (i) => i.type === "bulk") },
          ]}
        />
        <FilterGroup
          label="Shop or aisle"
          value={f.aisle}
          onChange={(v) => set("aisle", v)}
          options={categoriesAtoZ(db.categories).map((c) => ({ value: c.id, label: c.name, icon: <CategoryMark category={c} size="sm" />, count: count("aisle", (i) => i.categoryId === c.id) })).filter((o) => o.count > 0)}
        />
      </FilterSidebar>

      <div className="flex min-w-0 flex-1 flex-col gap-5 overflow-y-auto px-8 py-7 [&_[data-slot=table-container]]:overflow-visible">
        <PageTitle
          title={title}
          subtitle={`${plural(rows.length, "item")} · ${plural(staples, "Staple")} · ${below} below minimum · sorted by ${sorts[sort].summary}`}
        >
          <div className="flex items-center gap-3">
            <SortSelect value={sort} onChange={setSort} options={(Object.keys(sorts) as Sort[]).map((k) => ({ value: k, label: sorts[k].label }))} />
            {/* Matches the LOW and OUT pills in the Status column; works alongside the filters on the left. */}
            <Segmented
              label="Stock"
              className="w-auto"
              value={f.stock}
              onChange={(v) => set("stock", v)}
              options={[
                { value: "all", label: `All ${count("stock", () => true)}` },
                { value: "low", label: `Low ${count("stock", (i) => stockOf(i) === "low")}` },
                { value: "out", label: `Out ${count("stock", (i) => stockOf(i) === "out")}` },
              ]}
            />
            <Button variant="outline" onClick={() => navigate({ name: "import" })}>
              <UploadIcon />
              Import
            </Button>
          </div>
        </PageTitle>

        {/* The headers stick at -top-7, the page container's py-7, so they sit flush with its top edge and leave no gap. */}
        <Table className="text-sm">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {["Item", "Location", "In stock", "Minimum", "Status", "Use by", "Preferred brand", "Shop or aisle", "Price"].map((h) => (
                <TableHead key={h} className={cn("sticky -top-7 z-10 h-10 bg-background text-[10px] font-semibold tracking-widest shadow-[inset_0_-1px_0_var(--border)]", (h === "Minimum" || h === "Price") && "text-right")}>
                  {h === "Status" ? <HeadingTip label={h} tip={statusHelp} /> : h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((i) => {
              const selected = route.item === i.id
              const d = soonest(i)
              return (
                <TableRow
                  key={i.id}
                  data-state={selected ? "selected" : undefined}
                  className={cn("h-12 cursor-pointer", selected && "shadow-[inset_2px_0_0_var(--primary)]")}
                  onClick={(e) => {
                    // The stock stepper changes the count; it shouldn't also open the panel.
                    if ((e.target as HTMLElement).closest("button, input") && !(e.target as HTMLElement).closest("[data-row-open]")) return
                    navigate({ name: "pantry", item: i.id })
                  }}
                >
                  <TableCell className="pl-3">
                    {/* Still a button so the row can be opened from the keyboard. */}
                    <button type="button" data-row-open className="text-left text-[15px] font-semibold focus-visible:underline focus-visible:outline-none">
                      {i.name}
                    </button>
                    <ExpiryAlert item={i} className="ml-2 align-middle" />
                    {i.review && <span className="ml-2 align-middle"><NewPill tip="Added from a recipe and not bought yet." /></span>}
                  </TableCell>
                  <TableCell>{locationLabel(i.location)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Stepper size="sm" label={`${i.name} in stock`} value={i.inStock} onChange={(n) => actions.setStock(i.id, n)} />
                      <span className="text-muted-foreground">{isBulk(i) ? haveText(i).replace(/^\d+ /, "") : unitWord(i, i.inStock)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{i.target}</TableCell>
                  <TableCell>
                    {isStaple(i) ? <StockPill item={i} /> : <span className="text-xs text-muted-foreground">Not a Staple</span>}
                    {!isStaple(i) && needOf(i) > 0 && <span className="ml-2 text-xs">· on the list</span>}
                  </TableCell>
                  <TableCell className={cn(d && daysUntil(d) <= 3 && "font-semibold", i.noExpiry && "text-xs text-muted-foreground")}>{i.noExpiry ? "No expiry" : dateText(d)}</TableCell>
                  <TableCell>{i.brand || "Any"}</TableCell>
                  <TableCell><CategoryLabel category={db.categories.find((c) => c.id === i.categoryId)} /></TableCell>
                  <TableCell className="pr-3 text-right tabular-nums">{i.price ? money(i.price) : "–"}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
        {rows.length === 0 && <p className="py-6 text-sm text-muted-foreground">Nothing matches these filters.</p>}
      </div>

      <ItemPanel id={route.item} prefill={route.prefill} onClose={() => navigate({ name: "pantry" })} />
    </div>
  )
}

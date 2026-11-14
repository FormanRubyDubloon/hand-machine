// PAN-10: every item in one table, filters down the left, steppers change stock in place.
// Clicking a name opens the item panel (PAN-11, PAN-16), "Add item" opens it empty (PAN-12).
import * as React from "react"
import { UploadIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  daysUntil, dateText, haveText, isBulk, isStaple, locationLabel, locations, money, needOf, plural, soonest, stockOf, unitWord,
  type Item, type Location,
} from "../model"
import { navigate, type Route } from "../router"
import { usePantry } from "../state"
import { FilterGroup, FilterSidebar, PageTitle, Stepper, StockPill } from "../components"
import { ItemPanel } from "./item-panel"

type Show = "staples" | "not" | "below" | "out" | "soon"
type Filters = { location: "all" | Location; show: Show | null; type: "counted" | "bulk" | null; aisle: string | null }

const showTests: Record<Show, (i: Item) => boolean> = {
  staples: isStaple,
  not: (i) => !isStaple(i),
  below: (i) => stockOf(i) !== null,
  out: (i) => stockOf(i) === "out",
  soon: (i) => { const d = soonest(i); return !!d && daysUntil(d) <= 3 },
}
const showLabels: Record<Show, string> = { staples: "Staples", not: "Not Staples", below: "Below minimum", out: "Out of stock", soon: "Use within 3 days" }

function matches(i: Item, f: Filters, skip?: keyof Filters) {
  if (skip !== "location" && f.location !== "all" && i.location !== f.location) return false
  if (skip !== "show" && f.show && !showTests[f.show](i)) return false
  if (skip !== "type" && f.type && i.type !== f.type) return false
  if (skip !== "aisle" && f.aisle && i.categoryId !== f.aisle) return false
  return true
}

/** Soonest use-by first; nothing in stock goes last. */
const byUseBy = (a: Item, b: Item) => (soonest(a) ?? "9999").localeCompare(soonest(b) ?? "9999") || a.name.localeCompare(b.name)

export function PantryScreen({ route }: { route: Extract<Route, { name: "pantry" }> }) {
  const { items, db, actions } = usePantry()
  const [f, setF] = React.useState<Filters>({ location: "all", show: null, type: null, aisle: null })
  const all = Object.values(items).filter((i) => !i.oneOff)
  const rows = all.filter((i) => matches(i, f)).sort(byUseBy)
  const count = (k: keyof Filters, test: (i: Item) => boolean) => all.filter((i) => matches(i, f, k) && test(i)).length
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => setF({ ...f, [k]: v })
  const category = (id: string) => db.categories.find((c) => c.id === id)?.name ?? "–"

  const title = [f.show ? showLabels[f.show] : f.type ? (f.type === "bulk" ? "Bulk items" : "Counted items") : f.aisle ? category(f.aisle) : "All items", f.location !== "all" ? `in the ${locationLabel(f.location).toLowerCase()}` : ""].join(" ")
  const staples = rows.filter(isStaple).length
  const below = rows.filter((i) => stockOf(i)).length

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
          options={db.categories.map((c) => ({ value: c.id, label: c.name, count: count("aisle", (i) => i.categoryId === c.id) })).filter((o) => o.count > 0)}
        />
      </FilterSidebar>

      <div className="flex min-w-0 flex-1 flex-col gap-5 overflow-y-auto px-8 py-7">
        <PageTitle
          title={title}
          subtitle={`${plural(rows.length, "item")} · ${plural(staples, "Staple")} · ${below} below minimum · sorted by use-by date`}
        >
          <Button variant="outline" onClick={() => navigate({ name: "import" })}>
            <UploadIcon />
            Import
          </Button>
        </PageTitle>

        <Table className="text-sm">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {["Item", "Location", "In stock", "Minimum", "Status", "Use by", "Preferred brand", "Shop or aisle", "Price"].map((h) => (
                <TableHead key={h} className={cn("h-10 text-[10px] font-semibold tracking-widest", (h === "Minimum" || h === "Price") && "text-right")}>
                  {h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((i) => {
              const selected = route.item === i.id
              const d = soonest(i)
              return (
                <TableRow key={i.id} data-state={selected ? "selected" : undefined} className={cn("h-12", selected && "shadow-[inset_2px_0_0_var(--primary)]")}>
                  <TableCell className="pl-3">
                    <button type="button" className="text-left text-[15px] font-semibold hover:underline" onClick={() => navigate({ name: "pantry", item: i.id })}>
                      {i.name}
                    </button>
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
                  <TableCell className={cn(d && daysUntil(d) <= 3 && "font-semibold")}>{dateText(d)}</TableCell>
                  <TableCell>{i.brand || "Any"}</TableCell>
                  <TableCell>{category(i.categoryId)}</TableCell>
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

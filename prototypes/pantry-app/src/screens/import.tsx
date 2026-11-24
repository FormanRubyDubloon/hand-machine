// PAN-15: bring in several items at once. Only "Paste a list" works in the prototype; every method
// would end in the same "check before adding" table. Nothing is added until "Add N items".
import * as React from "react"
import { ArrowLeftIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { categoriesAtoZ, cap, locations, matchesName, normalise, plural, type Item, type Items, type Location } from "../model"
import { navigate } from "../router"
import { usePantry } from "../state"
import { Eyebrow, PageTitle } from "../components"
import { pluralise } from "./item-panel"

const methods = [
  { id: "paste", title: "Paste a list", sub: "Type or paste, one item per line" },
  { id: "sheet", title: "Spreadsheet", sub: "CSV or Excel. Match the columns" },
  { id: "receipt", title: "Receipt", sub: "Photo or PDF from the shop" },
  { id: "order", title: "Online order", sub: "Forward the order email" },
  { id: "notion", title: "From Notion", sub: "Pantry, list and recipes, once" },
  { id: "claude", title: "Ask Claude", sub: "Items, or a recipe to save" },
] as const

const example = `oat milk x2, keep 2
spinach
coconut milk 4 tins
sardines 2
halloumi, fridge
basmati rice 1kg bag`

type Row = {
  key: string
  include: boolean
  name: string
  type: Item["type"]
  qty: number
  unit?: string
  packSize?: number
  location?: Location
  target: number
  categoryId: string
  existing?: Item
}

// Rough guesses so the table starts useful. You check every row anyway.
const fridgeWords = ["milk", "spinach", "halloumi", "cheese", "yoghurt", "yogurt", "cream", "butter", "chicken", "fish", "salmon", "ham", "herbs"]
const categoryWords: [string, string][] = [
  ["coconut", "tins-and-jars"], ["milk", "dairy-and-chilled"], ["halloumi", "dairy-and-chilled"], ["cheese", "dairy-and-chilled"], ["yoghurt", "dairy-and-chilled"], ["butter", "dairy-and-chilled"],
  ["spinach", "fruit-and-veg"], ["apple", "fruit-and-veg"], ["onion", "fruit-and-veg"], ["potato", "fruit-and-veg"],
  ["rice", "grains-and-pulses"], ["pasta", "grains-and-pulses"], ["lentil", "grains-and-pulses"], ["tin", "tins-and-jars"], ["flour", "baking"], ["sugar", "baking"],
]

function parseLine(line: string, items: Items, k: number): Row | null {
  let text = line.trim()
  if (!text) return null
  let target = 0
  let location: Location | undefined
  const keep = text.match(/,?\s*keep\s+(\d+)/i)
  if (keep) {
    target = parseInt(keep[1], 10)
    text = text.replace(keep[0], "")
  }
  const loc = text.match(/,?\s*(fridge|freezer|cupboard|counter|household|other)\b/i)
  if (loc) {
    const word = loc[1].toLowerCase()
    location = (word === "other" ? "household" : word) as Location
    text = text.replace(loc[0], "")
  }
  let qty = 1
  let unit: string | undefined
  let packSize: number | undefined
  let type: Item["type"] = "counted"
  const pack = text.match(/\s(\d+(?:\.\d+)?)\s?(kg|g)\s+(bag|pack|jar|bottle)s?/i)
  if (pack) {
    packSize = Math.round(parseFloat(pack[1]) * (pack[2].toLowerCase() === "kg" ? 1000 : 1))
    unit = pack[3].toLowerCase()
    type = "bulk"
    text = text.replace(pack[0], "")
  }
  const amount = text.match(/\s(?:x\s?)?(\d+)\s*([a-z]+)?\s*$/i) ?? text.match(/\sx(\d+)/i)
  if (amount) {
    qty = parseInt(amount[1], 10)
    if (amount[2]) unit = amount[2].toLowerCase().replace(/s$/, "")
    text = text.replace(amount[0], "")
  }
  const name = cap(text.replace(/[,\s]+$/, "").trim())
  const existing = Object.values(items).find((i) => !i.oneOff && matchesName(i, name))
  const lower = name.toLowerCase()
  if (!location && existing) location = existing.location
  // Tins and jars live in the cupboard whatever's in them (coconut milk).
  if (!location && unit && /^(tin|jar)$/.test(unit)) location = "cupboard"
  if (!location && fridgeWords.some((w) => lower.includes(w))) location = "fridge"
  const categoryId = existing?.categoryId ?? categoryWords.find(([w]) => lower.includes(w))?.[1] ?? ""
  return { key: `${k}-${name}`, include: true, name: existing?.name ?? name, type: existing?.type ?? type, qty, unit: unit ?? existing?.unit?.[0], packSize, location, target: existing?.target ?? target, categoryId, existing }
}

export function ImportScreen() {
  const { items, db, actions } = usePantry()
  const [method, setMethod] = React.useState<(typeof methods)[number]["id"]>("paste")
  const [text, setText] = React.useState("")
  const [edits, setEdits] = React.useState<Record<string, Partial<Row>>>({})

  const parsed = React.useMemo(() => text.split("\n").map((l, k) => parseLine(l, items, k)).filter((r): r is Row => !!r), [text, items])
  const rows = parsed.map((r) => ({ ...r, ...edits[r.key] }))
  const edit = (key: string, patch: Partial<Row>) => setEdits({ ...edits, [key]: { ...edits[key], ...patch } })
  const chosen = rows.filter((r) => r.include)
  const blocked = chosen.filter((r) => !r.location)
  const fresh = chosen.filter((r) => !r.existing).length

  const add = () => {
    actions.importItems(
      chosen.map((r) => {
        const id = `item-${Date.now().toString(36)}-${r.key.replace(/\W/g, "")}`.toLowerCase()
        const item: Item = normalise({
          id, name: r.name, type: r.type, target: r.target, inStock: r.qty, categoryId: r.categoryId, where: [], location: r.location,
          unit: r.unit ? [r.unit, pluralise(r.unit)] : undefined, open: r.type === "bulk" ? 0 : undefined,
          packSize: r.packSize ? { amount: r.packSize, measure: "g" } : undefined,
        })
        return { existingId: r.existing?.id, item }
      }),
    )
    navigate({ name: "pantry" })
  }

  const happens = (r: Row) => (r.existing ? "Adds to existing" : !r.location ? "Needs a location" : r.target > 0 ? "New Staple" : "New")

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-8 py-7">
      <div className="flex flex-col gap-6">
        <Button variant="link" className="h-auto self-start p-0 text-xs" onClick={() => navigate({ name: "pantry" })}>
          <ArrowLeftIcon />
          All items
        </Button>
        <PageTitle title="Import" subtitle="Bring in several items at once. You check every row before anything is added." />

        <div className="grid grid-cols-6 gap-3" role="tablist" aria-label="Import from">
          {methods.map((m) => (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={method === m.id}
              onClick={() => setMethod(m.id)}
              className={cn(
                "flex flex-col gap-1 border p-4 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                method === m.id ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted",
              )}
            >
              <span className="text-sm font-semibold">{m.title}</span>
              <span className={cn("text-xs", method === m.id ? "text-primary-foreground/70" : "text-muted-foreground")}>{m.sub}</span>
            </button>
          ))}
        </div>

        {method !== "paste" ? (
          <div className="flex flex-col gap-2 border border-dashed border-ring p-8">
            <span className="text-sm font-semibold">Not built in this prototype</span>
            <span className="text-sm text-muted-foreground">
              {methods.find((m) => m.id === method)?.title} would end in the same "check before adding" table as Paste a list.
            </span>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[minmax(280px,1fr)_2.4fr] gap-8">
              <div className="flex flex-col gap-2">
                <Eyebrow>Your list</Eyebrow>
                <Textarea value={text} onChange={(e) => { setText(e.target.value); setEdits({}) }} placeholder={example} className="min-h-56 border border-border p-3 font-mono text-[13px]" aria-label="Your list" />
                <span className="text-xs text-muted-foreground">Add amounts, location ("fridge") or a minimum ("keep 2") if you know them.</span>
              </div>
              <div className="flex min-w-0 flex-col gap-2">
                <div className="flex items-baseline gap-3">
                  <Eyebrow className="text-foreground">Check before adding · {plural(rows.length, "row")}</Eyebrow>
                  <span className="text-xs text-muted-foreground">
                    {fresh} new · {chosen.length - fresh} {chosen.length - fresh === 1 ? "adds" : "add"} to an existing item{blocked.length ? ` · ${blocked.length} ${blocked.length === 1 ? "needs" : "need"} a location or aisle` : ""}
                  </span>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      {["", "Item", "Type", "Have", "Location", "Minimum", "Tag", "What happens"].map((h) => (
                        <TableHead key={h} className="h-9 text-[10px] font-semibold tracking-widest">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow key={r.key} className={cn(!r.include && "opacity-50", r.include && !r.location && "bg-muted")}>
                        <TableCell className="w-8"><Checkbox checked={r.include} onCheckedChange={(c) => edit(r.key, { include: !!c })} aria-label={`Include ${r.name}`} /></TableCell>
                        <TableCell className="font-semibold">{r.name}</TableCell>
                        <TableCell className="text-muted-foreground">{r.type === "bulk" ? `Bulk${r.packSize ? ` · ${r.packSize >= 1000 ? `${r.packSize / 1000} kg` : `${r.packSize} g`}` : ""}` : "Counted"}</TableCell>
                        <TableCell>{r.existing ? "+" : ""}{r.qty}{r.unit ? ` ${r.qty === 1 ? r.unit : pluralise(r.unit)}` : ""}</TableCell>
                        <TableCell className="w-[140px]">
                          {r.existing ? <span className="text-muted-foreground">{locations.find((l) => l.value === r.location)?.label}</span> : (
                            <Select value={r.location} onValueChange={(location) => edit(r.key, { location: location as Location })}>
                              <SelectTrigger size="sm" className="h-7 w-full" aria-label={`Location for ${r.name}`}><SelectValue placeholder="Choose" /></SelectTrigger>
                              <SelectContent>{locations.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent>
                            </Select>
                          )}
                        </TableCell>
                        <TableCell className="w-20">
                          {r.existing ? <span className="text-muted-foreground">{r.target}</span> : (
                            <Input type="number" min={0} value={r.target} onChange={(e) => edit(r.key, { target: Math.max(0, parseInt(e.target.value || "0", 10)) })} className="h-7 w-14" aria-label={`Minimum for ${r.name}`} />
                          )}
                        </TableCell>
                        <TableCell className="w-[170px]">
                          {r.existing ? <span className="text-muted-foreground">{db.categories.find((c) => c.id === r.categoryId)?.name}</span> : (
                            <Select value={r.categoryId || "none"} onValueChange={(v) => edit(r.key, { categoryId: v === "none" ? "" : v })}>
                              <SelectTrigger size="sm" className="h-7 w-full" aria-label={`Tag for ${r.name}`}><SelectValue placeholder="No tag" /></SelectTrigger>
                              <SelectContent><SelectItem value="none">No tag</SelectItem>{categoriesAtoZ(db.categories).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                            </Select>
                          )}
                        </TableCell>
                        <TableCell className={cn("text-xs", !r.location && r.include && "font-semibold")}>{happens(r)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <span className="text-xs text-muted-foreground">Minimum starts at 0 unless you give one. Set a minimum to make an item a Staple.</span>
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 border-t border-border pt-5">
              <span className="text-sm">{blocked.length ? `Set a location for ${blocked.map((r) => r.name).join(", ")}, or untick ${blocked.length === 1 ? "it" : "them"}.` : `Ready to add ${plural(chosen.length, "item")}.`}</span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => navigate({ name: "pantry" })}>Cancel</Button>
                <Button disabled={!chosen.length || blocked.length > 0} onClick={add}>Add {plural(chosen.length, "item")}</Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

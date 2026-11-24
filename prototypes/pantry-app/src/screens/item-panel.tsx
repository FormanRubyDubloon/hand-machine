// The item side panel, built to claude/handoff-item-panel.md (21 Nov 2026): PANEL-G (Add) and
// PANEL-H (Edit). Add asks for a name, where it lives and how many, with the rest behind a click,
// and saves on Add item. Edit shows the units first, folds every other detail into rows (one open
// at a time) and saves each change as it's made. PAN-17 (merge) opens over Edit.
import * as React from "react"
import { ArrowLeftRightIcon, CheckIcon, ChevronDownIcon, EllipsisIcon, MinusIcon, PlusIcon, ShoppingCartIcon, XIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import {
  addListBox, aisleTiles, aisleTitle, amountOf, cap, categoriesAtoZ, dateText, daysUntil, entryTotal, haveText, isBulk, isStaple, listBox, locationLabel, locations,
  lower, matchesName, measureText, money, nameList, needOf, normalise, openUnit, plural, recipesUsing, todayIso, unitNames, unitsOf, whenText,
  itemAisle, tagsOf, withAisle, withTags, withUnits, type AisleValue, type Item, type ListBox, type Location, type Store, type Unit,
} from "../model"
import { navigate } from "../router"
import { usePantry } from "../state"
import { Eyebrow, Field } from "../components"

/** "bag" → "bags", "loaf" → "loaves", "box" → "boxes". */
export function pluralise(word: string) {
  if (!word) return word
  if (/(s|x|ch|sh)$/.test(word)) return `${word}es`
  if (/f$/.test(word)) return word.replace(/f$/, "ves")
  if (/[^aeiou]y$/.test(word)) return word.replace(/y$/, "ies")
  return `${word}s`
}

export function blankItem(name = ""): Item {
  return { id: `item-${Date.now().toString(36)}`, name, type: "counted", target: 0, inStock: 1, categoryId: "", where: [], useBy: [null] }
}

// ---------- small pieces ----------

/** "today", "12 Jan" within about nine months, otherwise "Mar 2028". */
function dayText(iso: string) {
  if (iso === todayIso()) return "today"
  const d = new Date(`${iso}T00:00:00`)
  const t = new Date()
  const months = (d.getFullYear() - t.getFullYear()) * 12 + d.getMonth() - t.getMonth()
  if (months > -10 && months < 9) return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
  return d.toLocaleDateString("en-GB", { month: "short", year: "numeric" })
}

/** "350 g", "1.5 kg", "500ml" → a pack size. Anything else is null. */
function parseSize(text: string): Item["packSize"] | null {
  const m = text.trim().toLowerCase().match(/^(\d+(?:[.,]\d+)?)\s*(g|kg|ml|l|litres?)$/)
  if (!m) return null
  const n = parseFloat(m[1].replace(",", "."))
  const big = m[2] === "kg" || m[2].startsWith("l")
  return { amount: Math.round(big ? n * 1000 : n), measure: m[2] === "g" || m[2] === "kg" ? "g" : "ml" }
}
const sizeText = (i: Item) => (i.packSize ? measureText(i.packSize.amount, i.packSize.measure) : "")

const penceText = (p?: number) => (p ? (p / 100).toFixed(2) : "")
function parsePence(text: string) {
  const v = parseFloat(text.replace(/[£,\s]/g, ""))
  return Number.isFinite(v) && v > 0 ? Math.round(v * 100) : undefined
}
const splitNames = (text: string) => text.split(",").map((s) => s.trim()).filter(Boolean)

/** "in the Fridge", "on the Counter", "in Other". */
function placeText(l?: Location) {
  if (!l) return ""
  if (l === "household") return "in Other"
  return `${l === "counter" ? "on" : "in"} the ${locationLabel(l)}`
}

const label = "text-sm font-semibold"
const hint = "text-[13px] leading-[18px] text-muted-foreground"
const lineInput = "h-10 w-full border-0 border-b border-[var(--line-strong)] bg-transparent px-0.5 text-base text-foreground outline-none placeholder:text-[#8A7868] focus-visible:border-primary"
const quietButton = "h-10 rounded-[4px] border border-border bg-background px-4 text-xs font-semibold tracking-[0.1em] text-foreground uppercase hover:bg-muted disabled:cursor-not-allowed disabled:opacity-45"
const primaryButton = "h-10 rounded-[4px] border border-primary bg-primary px-4 text-xs font-semibold tracking-[0.1em] text-primary-foreground uppercase hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-45"
const textLink = "self-start text-sm text-foreground underline underline-offset-4 hover:text-primary"
const focus = "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"

/**
 * An item's tags (Batch 4b, 24 Nov 2026): every tag as a chip, A to Z, on when the item has it. Optional, and an
 * item can have several. The first one chosen is kept as its category for the apps that know one tag.
 */
function TagPicker({ value, onChange }: { value: string[]; onChange: (tags: string[]) => void }) {
  const { db } = usePantry()
  return (
    <div role="group" aria-label="Tags" className="flex flex-wrap gap-1.5">
      {categoriesAtoZ(db.categories).map((c) => {
        const on = value.includes(c.id)
        return (
          <button
            key={c.id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((t) => t !== c.id) : [...value, c.id])}
            className={cn(
              "h-8 rounded-full border px-3 text-[13px] transition-colors",
              on ? "border-primary bg-primary font-semibold text-primary-foreground" : "border-border bg-background hover:bg-muted",
              focus,
            )}
          >
            {c.name}
          </button>
        )
      })}
    </div>
  )
}

/** An aisle as a <select> value: "" for none, "n:4" for a number, "p:Freezer" for a place. */
const aisleValue = (a: AisleValue | null) => (a === null ? "" : typeof a === "number" ? `n:${a}` : `p:${a}`)
const fromAisleValue = (v: string): AisleValue | null => (v.startsWith("n:") ? Number(v.slice(2)) : v.startsWith("p:") ? v.slice(2) : null)

/**
 * The item's aisle in each store that has aisle numbers (Batch 4b): numbers up to the store's number of aisles (or
 * further, if the item is already there), then its places. The phone learns these at tick-offs; this is for fixing.
 */
function AislePickers({ item, onChange }: { item: Item; onChange: (storeId: string, a: AisleValue | null) => void }) {
  const { db, items } = usePantry()
  const numbered = db.stores.filter((s) => !s.noAisleNumbers)
  if (!numbered.length) return null
  const options = (s: Store) => {
    const current = itemAisle(item, s)
    const top = Math.max(aisleTiles(s, Object.values(items)), typeof current === "number" ? current : 0)
    const places = [...(s.places ?? []), ...(typeof current === "string" && !(s.places ?? []).some((p) => p.toLowerCase() === current.toLowerCase()) ? [current] : [])]
    return { current, numbers: Array.from({ length: top }, (_, k) => k + 1), places }
  }
  return (
    <div className="flex flex-col gap-2">
      <span className={label}>Aisle</span>
      <div className="grid grid-cols-[1fr_140px] items-center gap-x-4 gap-y-1">
        {numbered.map((s) => {
          const o = options(s)
          return (
            <React.Fragment key={s.id}>
              <span className="truncate text-sm">{s.name}</span>
              <select aria-label={`Aisle at ${s.name}`} className={cn(lineInput, "h-9", o.current === null && "text-muted-foreground")} value={aisleValue(o.current)} onChange={(e) => onChange(s.id, fromAisleValue(e.target.value))}>
                <option value="">No aisle</option>
                {o.numbers.map((n) => <option key={n} value={`n:${n}`}>{aisleTitle(n)}</option>)}
                {o.places.map((p) => <option key={p} value={`p:${p}`}>{p}</option>)}
              </select>
            </React.Fragment>
          )
        })}
      </div>
      <span className={hint}>Each store has its own aisles. The phone asks for them as you shop; set more aisles or places in Settings, Stores.</span>
    </div>
  )
}

function IconButton({ label: name, children, className, ...props }: React.ComponentProps<"button"> & { label: string }) {
  return (
    <button type="button" aria-label={name} className={cn("flex size-10 shrink-0 items-center justify-center rounded-[4px] border border-border bg-background text-foreground hover:bg-muted [&_svg]:size-[18px]", focus, className)} {...props}>
      {children}
    </button>
  )
}

function SmallLabel({ children, id, className }: { children: React.ReactNode; id?: string; className?: string }) {
  return <span id={id} className={cn("text-[10px] font-semibold tracking-[0.1em] text-muted-foreground uppercase", className)}>{children}</span>
}

/** − n +. The value is announced as it changes. */
function Counter({ value, onChange, min = 0, max, size = "md", labelledBy, label: name, less, more, format }: {
  value: number; onChange: (n: number) => void; min?: number; max?: number; size?: "lg" | "md" | "sm"
  labelledBy?: string; label?: string; less: string; more: string; format?: (n: number) => string
}) {
  const box = size === "lg" ? "size-11" : "size-10"
  const text = size === "lg" ? "w-14 text-[22px]" : size === "md" ? "w-12 text-xl" : "w-11 text-[17px]"
  return (
    <span role="group" aria-labelledby={labelledBy} aria-label={name} className="inline-flex shrink-0 items-center rounded-[4px] border border-border">
      <button type="button" aria-label={less} disabled={value <= min} onClick={() => onChange(value - 1)} className={cn(box, "flex items-center justify-center bg-background text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-45", focus)}>
        <MinusIcon className="size-4" />
      </button>
      <span aria-live="polite" className={cn(text, "text-center font-semibold tabular-nums", format && "w-[72px] text-[15px]")}>{format ? format(value) : value}</span>
      <button type="button" aria-label={more} disabled={max !== undefined && value >= max} onClick={() => onChange(value + 1)} className={cn(box, "flex items-center justify-center bg-background text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-45", focus)}>
        <PlusIcon className="size-4" />
      </button>
    </span>
  )
}

function Toggle({ on, onChange, labelledBy }: { on: boolean; onChange: (on: boolean) => void; labelledBy: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-labelledby={labelledBy}
      onClick={() => onChange(!on)}
      className={cn("flex h-7 w-12 shrink-0 rounded-full border border-primary p-0.5", on ? "justify-end bg-primary" : "justify-start bg-muted", focus)}
    >
      <span aria-hidden className={cn("size-[22px] rounded-full", on ? "bg-primary-foreground" : "bg-primary")} />
    </button>
  )
}

/** Counted / Bulk. */
function TwoWay<T extends string>({ value, onChange, options, label: name }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; label: string }) {
  return (
    <div role="group" aria-label={name} className="flex overflow-hidden rounded-[4px] border border-primary">
      {options.map((o, k) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn("h-10 flex-1 px-1.5 text-xs font-semibold tracking-[0.1em] uppercase", k > 0 && "border-l border-primary", value === o.value ? "bg-primary text-primary-foreground" : "bg-background text-foreground hover:bg-muted", focus, "focus-visible:-outline-offset-4")}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

// The location icons from PANEL-G. Fridge and Other are Lucide's; the cupboard and fruit bowl were drawn for the panel.
const LOCATION_ICONS: Record<Location, React.ReactNode> = {
  fridge: <><path d="M5 6a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6Z" /><path d="M5 10h14" /><path d="M15 6v1" /><path d="M15 13v3" /></>,
  freezer: <><path d="M2 12h20" /><path d="M12 2v20" /><path d="m20 16-4-4 4-4" /><path d="m4 8 4 4-4 4" /><path d="m16 4-4 4-4-4" /><path d="m8 20 4-4 4 4" /></>,
  cupboard: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M12 3v18" /><path d="M9 12h.01" /><path d="M15 12h.01" /></>,
  counter: <><path d="M3 13h18" /><path d="M4 13a8 7 0 0 0 16 0" /><circle cx="9" cy="9.5" r="3" /><circle cx="15.5" cy="10" r="2.5" /><path d="M9 6.5 10 4" /><path d="M9 20h6" /></>,
  // A bath (Lucide's), as on the phone: Other is mostly toiletries and cleaning things (Isaac's change, 24 Nov 2026).
  household: <><path d="M10 4 8 6" /><path d="M17 19v2" /><path d="M2 12h20" /><path d="M7 19v2" /><path d="M9 5 7.621 3.621A2.121 2.121 0 0 0 4 5v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5" /></>,
}

function LocationPicker({ value, onChange }: { value?: Location; onChange: (l: Location) => void }) {
  return (
    <div role="group" aria-label="Location" className="flex overflow-hidden rounded-[4px] border border-primary">
      {locations.map((o, k) => {
        const on = value === o.value
        // A divider only between two unselected neighbours.
        const line = k > 0 && !on && value !== locations[k - 1].value
        return (
          <React.Fragment key={o.value}>
            {k > 0 && <span aria-hidden className={cn("h-8 w-px shrink-0 self-center", line ? "bg-border" : "bg-transparent")} />}
            <button
              type="button"
              aria-pressed={on}
              onClick={() => onChange(o.value)}
              className={cn("flex h-16 min-w-0 flex-1 flex-col items-center justify-center gap-1.5 px-1 text-[11px] font-semibold tracking-[0.08em] uppercase", on ? "bg-primary text-primary-foreground" : "bg-background text-foreground hover:bg-muted", focus, "focus-visible:-outline-offset-4")}
            >
              <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">{LOCATION_ICONS[o.value]}</svg>
              <span>{o.label}</span>
            </button>
          </React.Fragment>
        )
      })}
    </div>
  )
}

/** A folded detail row: title, one-line summary, and its contents below when open. */
function Fold({ title, summary, open, onToggle, children, titleWidth = 160 }: { title: string; summary: React.ReactNode; open: boolean; onToggle: () => void; children: React.ReactNode; titleWidth?: number }) {
  const id = React.useId()
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={onToggle}
        className={cn("flex min-h-14 w-full items-center gap-3 border-b border-border py-2 text-left text-foreground", focus)}
      >
        <span className="shrink-0 text-sm font-semibold" style={{ width: titleWidth }}>{title}</span>
        <span className="min-w-0 flex-1 text-sm text-muted-foreground">{summary}</span>
        <ChevronDownIcon aria-hidden className={cn("size-4 shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {open && <div id={id} className="flex flex-col gap-5 border-b border-border pt-5 pb-6">{children}</div>}
    </div>
  )
}

function ListBoxView({ box }: { box: ListBox }) {
  return (
    <div role="status" className={cn("flex items-start gap-3 rounded-[4px] border px-4 py-3.5", box.on ? "border-primary bg-muted" : "border-border bg-background")}>
      <ShoppingCartIcon aria-hidden className="mt-px size-[18px] shrink-0" />
      <div className="flex flex-col gap-1">
        <span className="text-[15px] font-semibold">{box.head}</span>
        <span className="text-sm leading-5 text-muted-foreground">{box.reason}</span>
      </div>
    </div>
  )
}

function StepRow({ title, sub, id, children }: { title: string; sub: React.ReactNode; id?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex flex-col gap-1">
        <span id={id} className={label}>{title}</span>
        <span className={hint}>{sub}</span>
      </div>
      {children}
    </div>
  )
}

/**
 * Unit, typed in the singular ("bag", "punnet"). The plural is guessed. Blank counts the item
 * itself ("3 eggs"). Saved when you leave the field.
 */
function UnitField({ unit, onChange }: { unit?: [string, string]; onChange: (u: [string, string] | undefined) => void }) {
  return (
    <label className="flex min-w-0 flex-1 flex-col gap-1.5">
      <span className={label}>Unit</span>
      <BlurInput
        className={lineInput}
        placeholder="e.g. bag"
        value={unit?.[0] ?? ""}
        onCommit={(v) => {
          const one = v.trim().toLowerCase()
          if (one === (unit?.[0] ?? "")) return
          onChange(one ? [one, pluralise(one)] : undefined)
        }}
      />
    </label>
  )
}

/** Size of each, as text; it's kept as a pack size when it reads as grams or millilitres. */
function SizeField({ item, onChange }: { item: Item; onChange: (size: Item["packSize"]) => void }) {
  const [text, setText] = React.useState(sizeText(item))
  const [bad, setBad] = React.useState(false)
  const shown = sizeText(item)
  const [lastShown, setLastShown] = React.useState(shown)
  if (shown !== lastShown) {
    setLastShown(shown)
    setText(shown)
  }
  return (
    <label className="flex min-w-0 flex-1 flex-col gap-1.5">
      <span className={label}>Size of each</span>
      <input
        className={lineInput}
        value={text}
        placeholder="e.g. 350 g"
        aria-invalid={bad}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          if (!text.trim()) return setBad(false), onChange(undefined)
          const size = parseSize(text)
          setBad(!size)
          if (size) onChange(size)
        }}
      />
      {bad && <span className={hint}>Use grams or millilitres, like 350 g or 1.5 kg.</span>}
    </label>
  )
}

const typeExplain = (i: Item, adding: boolean) => {
  const [one, many] = unitNames(i)
  if (!isBulk(i)) return "Used up in one go, like tins or eggs. You count how many you have."
  return adding
    ? `Used a bit at a time, like flour or rice. New ${many} start full. Open ones don't count towards your minimum.`
    : `Used a bit at a time, like flour or rice. Each ${one} is full or open, and only full ones count towards your minimum.`
}

function PanelShell({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        showCloseButton={false}
        style={{ width: 560, maxWidth: "100vw" }}
        className="gap-0 bg-background text-foreground outline-none sm:max-w-none"
        onOpenAutoFocus={(e) => {
          e.preventDefault()
          ;(e.currentTarget as HTMLElement | null)?.focus()
        }}
        tabIndex={-1}
      >
        <SheetTitle className="sr-only">{title}</SheetTitle>
        <SheetDescription className="sr-only">Item details</SheetDescription>
        {children}
        {footer}
      </SheetContent>
    </Sheet>
  )
}

// ---------- the panel ----------

export function ItemPanel({ id, prefill, seed, onSaved, onClose }: { id?: string; prefill?: string; seed?: Partial<Item>; onSaved?: (id: string) => void; onClose: () => void }) {
  const { items } = usePantry()
  const isNew = id === "new"
  // Keep the panel open on a deleted item, to say it's gone.
  const [deleted, setDeleted] = React.useState<string | null>(null)
  const [lastId, setLastId] = React.useState(id)
  if (id !== lastId) {
    setLastId(id)
    setDeleted(null)
  }
  const saved = id && !isNew ? items[id] : undefined

  if (isNew) return <AddPanel key={prefill ?? ""} prefill={prefill} seed={seed} onSaved={onSaved} onClose={onClose} />
  if (deleted) {
    return (
      <PanelShell open onClose={onClose} title={`${deleted} deleted`}>
        <div className="flex flex-1 flex-col items-start justify-center gap-4 p-8">
          <h2 className="font-serif text-[30px] leading-[1.05] font-bold">{deleted} deleted</h2>
          <span role="status" className="text-[15px] text-muted-foreground">It has gone from your pantry and the shopping list. You can undo it from History today.</span>
          <button type="button" className={cn(quietButton, focus)} onClick={onClose}>Close</button>
        </div>
      </PanelShell>
    )
  }
  return <EditPanel key={id} item={saved} onClose={onClose} onDeleted={setDeleted} />
}

// ---------- Add (PANEL-G) ----------

const DEFAULT_NAME = "New item"
type Extra = "store" | "price" | "brand" | "other" | "notes"
const CHIPS: { key: Extra; label: string }[] = [
  { key: "store", label: "Store" }, { key: "price", label: "Price" }, { key: "brand", label: "Preferred brand" }, { key: "other", label: "Other names" }, { key: "notes", label: "Notes" },
]

type AddForm = {
  item: Item
  /** Already open (Bulk). */
  openShown: boolean
  hasUseBy: boolean
  oneDate: boolean
  date: string
  dates: string[]
  /** Which date field to focus next: the single one, or a unit's. */
  focusDate: "one" | number | null
  rulesOpen: boolean
  extras: Extra[]
  price: string
  otherNames: string
  dupDismissed: string
}

function freshForm(prefill?: string, seed?: Partial<Item>, keep?: Partial<Item>): AddForm {
  const base = normalise({ ...blankItem(prefill || DEFAULT_NAME), useBy: [], noExpiry: true, ...seed, ...keep })
  return {
    item: base, openShown: false, hasUseBy: false, oneDate: true, date: "", dates: [], focusDate: null, rulesOpen: false,
    extras: [], price: "", otherNames: "", dupDismissed: "",
  }
}

function AddPanel({ prefill, seed, onSaved, onClose }: { prefill?: string; seed?: Partial<Item>; onSaved?: (id: string) => void; onClose: () => void }) {
  const { items, db, actions } = usePantry()
  const [f, setF] = React.useState<AddForm>(() => freshForm(prefill, seed))
  const [addAnother, setAddAnother] = React.useState(false)
  const [toast, setToast] = React.useState("")
  const [done, setDone] = React.useState<{ title: string; line: string } | null>(null)
  const nameRef = React.useRef<HTMLInputElement>(null)

  const i = f.item
  const bulk = isBulk(i)
  const [one, many] = unitNames(i)
  const set = (patch: Partial<Item>) => setF((s) => ({ ...s, item: normalise({ ...s.item, ...patch }) }))
  const name = i.name.trim()
  const nameOk = !!name && name.toLowerCase() !== DEFAULT_NAME.toLowerCase()
  const dup = nameOk ? Object.values(items).find((x) => !x.oneOff && matchesName(x, name)) : undefined
  const showDup = !!dup && f.dupDismissed !== dup.id
  // Tags are optional (Batch 4b, 24 Nov 2026).
  const missing = [!nameOk && "a name", !i.location && "a location"].filter(Boolean) as string[]
  const n = i.inStock

  const setQty = (q: number) =>
    setF((s) => {
      const qty = Math.max(0, q)
      const dates = s.dates.slice(0, qty)
      while (dates.length < qty) dates.push(s.oneDate ? s.date : "")
      const grew = qty > s.item.inStock
      return {
        ...s,
        item: normalise({ ...s.item, inStock: qty, open: bulk ? Math.min(s.item.open ?? 0, qty) : undefined }),
        dates,
        oneDate: qty < 2 ? true : s.oneDate,
        focusDate: grew && s.hasUseBy ? (s.oneDate || qty < 2 ? (s.date ? null : "one") : qty - 1) : null,
      }
    })

  const reset = (keepLocation?: Location) => {
    setF(freshForm(undefined, undefined, keepLocation ? { location: keepLocation } : undefined))
    setDone(null)
  }

  const submit = () => {
    if (missing.length) return
    const useBy = f.hasUseBy ? (f.oneDate ? Array<string | null>(n).fill(f.date || null) : f.dates.map((d) => d || null)) : []
    const units: Unit[] = Array.from({ length: n }, (_, k) => ({ open: bulk && k < (i.open ?? 0), useBy: useBy[k] ?? null, openedAt: null }))
    const item = withUnits(
      {
        ...i,
        name,
        noExpiry: f.hasUseBy ? undefined : true,
        price: parsePence(f.price),
        priceEstimate: undefined,
        otherNames: splitNames(f.otherNames).length ? splitNames(f.otherNames) : undefined,
        useWithinWeeks: undefined,
      },
      units,
    )
    actions.saveItem(item, true)
    onSaved?.(item.id)
    // Adding from a recipe goes straight back to the recipe.
    if (seed) return onClose()
    if (addAnother) {
      reset(i.location)
      setToast(`Added ${name} ${placeText(i.location)}. Ready for the next one.`)
      setTimeout(() => nameRef.current?.focus(), 0)
      return
    }
    const stock = n ? cap(unitText2(item, n)) : "No stock yet"
    setDone({
      title: `${name} added`,
      line: `${stock} ${placeText(i.location)}. ${isStaple(item) ? `It's a Staple with a minimum of ${item.target}.` : "It isn't a Staple."}`,
    })
  }

  const addToExisting = () => {
    if (!dup) return
    actions.setStock(dup.id, dup.inStock + 1)
    const after = dup.inStock + 1
    setDone({ title: `${dup.name} updated`, line: `Added ${unitText2(dup, 1)} to ${dup.name}. You now have ${unitText2(dup, after)}.` })
  }

  const stores = db.stores.map((s) => {
    const aisle = itemAisle(i, s)
    return { id: s.id, label: aisle !== null ? `${s.name} · ${aisleTitle(aisle)}` : s.name }
  })

  if (done) {
    return (
      <PanelShell open onClose={onClose} title={done.title}>
        <div className="flex flex-1 flex-col justify-center gap-4 p-8">
          <span className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground"><CheckIcon aria-hidden className="size-[22px]" strokeWidth={2.5} /></span>
          <h2 className="font-serif text-[30px] leading-[1.05] font-bold">{done.title}</h2>
          <span role="status" className="text-[15px] leading-[21px] text-muted-foreground">{done.line}</span>
          <div className="flex gap-2 pt-2">
            <button type="button" className={cn(primaryButton, focus)} onClick={() => { reset(); setTimeout(() => nameRef.current?.focus(), 0) }}>Add another item</button>
            <button type="button" className={cn(quietButton, focus)} onClick={onClose}>Close</button>
          </div>
        </div>
      </PanelShell>
    )
  }

  return (
    <PanelShell
      open
      onClose={onClose}
      title="Add to pantry"
      footer={
        <div className="flex shrink-0 flex-col gap-2.5 border-t border-border px-8 pt-3.5 pb-[18px]">
          {missing.length > 0 && <span className="text-[13px] text-muted-foreground">To add it, give it {nameList(missing)}.</span>}
          <div className="flex items-center gap-2">
            <label className="flex min-h-10 flex-1 items-center gap-2.5 text-sm">
              <input type="checkbox" checked={addAnother} onChange={(e) => setAddAnother(e.target.checked)} className={cn("size-[18px] accent-primary", focus)} />
              Add another after this
            </label>
            <button type="button" className={cn(quietButton, focus)} onClick={onClose}>Cancel</button>
            <button type="button" className={cn(primaryButton, "px-[18px]", focus)} disabled={missing.length > 0} onClick={submit}>Add item</button>
          </div>
        </div>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-8 pt-6 pb-8">
        <div className="flex items-start gap-2">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <SmallLabel>Add to pantry</SmallLabel>
            <input
              ref={nameRef}
              aria-label="Item name"
              value={i.name}
              placeholder="Name"
              onChange={(e) => {
                set({ name: e.target.value })
                setToast("")
              }}
              onFocus={(e) => {
                const el = e.currentTarget
                if (el.value === DEFAULT_NAME) setTimeout(() => el.select(), 0)
              }}
              className={cn(
                "h-12 w-full border-0 border-b-2 bg-transparent px-0.5 font-serif text-[30px] font-bold outline-none placeholder:text-[#8A7868]",
                nameOk ? "border-primary text-foreground" : "border-[var(--line-strong)] text-muted-foreground",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
              )}
            />
          </div>
          <IconButton label="Close" className="mt-[18px]" onClick={onClose}><XIcon /></IconButton>
        </div>

        {toast && (
          <div role="status" className="flex items-center gap-2.5 rounded-[4px] bg-muted px-3.5 py-3 text-sm">
            <CheckIcon aria-hidden className="size-4 shrink-0" />
            <span>{toast}</span>
          </div>
        )}

        {showDup && dup && (
          <div role="status" className="flex flex-col gap-3 rounded-[4px] border border-primary bg-muted p-4">
            <span className="text-[15px] leading-[21px]">
              You already have <strong>{dup.name}</strong>: {dup.inStock ? haveText(dup) : "none in stock"}{dup.location ? ` ${placeText(dup.location)}` : ""}.
            </span>
            <div className="flex flex-wrap items-center gap-4">
              <button type="button" className={cn(primaryButton, focus)} onClick={addToExisting}>Add {unitText2(dup, 1)} to stock instead</button>
              <button type="button" className={cn(textLink, focus)} onClick={() => setF((s) => ({ ...s, dupDismissed: dup.id }))}>Add as a separate item</button>
            </div>
          </div>
        )}

        <section aria-labelledby="add-where" className="flex flex-col gap-3.5">
          <SmallLabel id="add-where">Where it lives</SmallLabel>
          <LocationPicker value={i.location} onChange={(location) => set({ location })} />
          <div className="mt-2.5 flex flex-col gap-2">
            <span className={label}>Tags <span className="font-normal text-muted-foreground">(optional)</span></span>
            <TagPicker value={tagsOf(i)} onChange={(tags) => setF((s) => ({ ...s, item: withTags(s.item, tags) }))} />
          </div>
        </section>

        <section aria-labelledby="add-stock" className="flex flex-col gap-4">
          <SmallLabel id="add-stock">What you're adding</SmallLabel>
          <StepRow
            id="add-qty"
            title={`How many ${many}`}
            sub={n === 0 ? "None in stock yet. You can still add it." : f.hasUseBy ? "Each one gets a use-by date." : "Marked as bought today."}
          >
            <Counter size="lg" value={n} onChange={setQty} labelledBy="add-qty" less="One fewer" more="One more" />
          </StepRow>

          {bulk && n > 0 && !f.openShown && (
            <button type="button" className={cn(textLink, focus)} onClick={() => setF((s) => ({ ...s, openShown: true }))}>Some already open?</button>
          )}
          {bulk && n > 0 && f.openShown && (
            <StepRow id="add-open" title="Already open" sub="Open ones don't count towards your minimum.">
              <Counter size="sm" value={i.open ?? 0} max={n} onChange={(o) => set({ open: o })} labelledBy="add-open" less="One fewer open" more="One more open" />
            </StepRow>
          )}

          <div className="border-t border-border">
            <Fold
              title="Stock rules"
              titleWidth={120}
              open={f.rulesOpen}
              onToggle={() => setF((s) => ({ ...s, rulesOpen: !s.rulesOpen }))}
              summary={`${bulk ? "Bulk" : "Counted"} · ${many}${i.packSize ? ` of ${sizeText(i)}` : ""} · minimum ${i.target}`}
            >
              <StepRow title="Minimum to keep" sub="Above 0 makes it a Staple.">
                <Counter value={i.target} onChange={(target) => set({ target })} label="Minimum to keep" less="Lower minimum" more="Raise minimum" />
              </StepRow>
              <div className="flex flex-col gap-2">
                <span className={label}>How you use it</span>
                <TwoWay label="How you use it" value={i.type} onChange={(type) => set({ type, open: type === "bulk" ? i.open ?? 0 : undefined })} options={[{ value: "counted", label: "Counted" }, { value: "bulk", label: "Bulk" }]} />
                <span className={hint}>{typeExplain(i, true)}</span>
              </div>
              <div className="flex flex-wrap gap-5">
                <UnitField unit={i.unit} onChange={(unit) => set({ unit })} />
                <SizeField item={i} onChange={(packSize) => set({ packSize })} />
              </div>
            </Fold>
          </div>

          <StepRow id="add-useby" title="Has a use-by date" sub={f.hasUseBy ? `Each ${one} has its own date.` : `Off, so each ${one} shows when you bought it.`}>
            <Toggle
              labelledBy="add-useby"
              on={f.hasUseBy}
              onChange={(on) => setF((s) => ({ ...s, hasUseBy: on, oneDate: true, focusDate: on && s.item.inStock > 0 ? "one" : null }))}
            />
          </StepRow>

          {f.hasUseBy && n > 0 && f.oneDate && (
            <div className="flex items-end justify-between gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-[13px] text-muted-foreground">{n > 1 ? `Use by, all ${n}` : "Use by"}</span>
                <DateField
                  value={f.date}
                  focus={f.focusDate === "one"}
                  onChange={(v) => setF((s) => ({ ...s, date: v, dates: s.dates.map(() => v), focusDate: null }))}
                />
              </label>
              {n > 1 && (
                <button type="button" className={cn(textLink, "pb-2.5", focus)} onClick={() => setF((s) => ({ ...s, oneDate: false, dates: s.dates.map(() => s.date), focusDate: 1 }))}>
                  Different dates?
                </button>
              )}
            </div>
          )}
          {f.hasUseBy && n > 1 && !f.oneDate && (
            <div className="flex flex-col gap-2.5">
              <div className="grid grid-cols-2 gap-x-5 gap-y-3">
                {f.dates.map((d, k) => (
                  <label key={k} className="flex flex-col gap-1.5">
                    <span className="text-[13px] text-muted-foreground">{cap(one)} {k + 1} use by</span>
                    <DateField
                      value={d}
                      focus={f.focusDate === k}
                      onChange={(v) => setF((s) => ({ ...s, dates: s.dates.map((x, j) => (j === k ? v : x)), focusDate: null }))}
                    />
                  </label>
                ))}
              </div>
              <button type="button" className={cn(textLink, focus)} onClick={() => setF((s) => ({ ...s, oneDate: true, date: s.dates[0] || "", focusDate: null }))}>Use one date for all</button>
            </div>
          )}

          <ListBoxView box={addListBox(i)} />
        </section>

        <section aria-labelledby="add-optional" className="flex flex-col gap-3.5">
          <SmallLabel id="add-optional">Optional details</SmallLabel>
          {f.extras.includes("store") && (
            <label className="flex flex-col gap-1.5">
              <span className={label}>Store</span>
              <select className={lineInput} value={i.where[0] ?? "any"} onChange={(e) => set({ where: e.target.value === "any" ? [] : [e.target.value] })} autoFocus>
                <option value="any">Any store</option>
                {stores.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
              <span className={hint}>Any store puts it on every store's shopping list. Its aisle in each store is learned when you shop.</span>
            </label>
          )}
          {f.extras.includes("price") && (
            <label className="flex flex-col gap-1.5">
              <span className={label}>Price each</span>
              <span className="flex items-center gap-1 border-b border-[var(--line-strong)] focus-within:border-primary">
                <span aria-hidden className="text-base text-muted-foreground">£</span>
                <input className={cn(lineInput, "border-0")} inputMode="decimal" placeholder="0.00" value={f.price} onChange={(e) => setF((s) => ({ ...s, price: e.target.value }))} autoFocus />
              </span>
              <span className={hint}>Leave it blank and Claude will estimate it. Estimates are marked.</span>
            </label>
          )}
          {f.extras.includes("brand") && (
            <label className="flex flex-col gap-1.5">
              <span className={label}>Preferred brand</span>
              <input className={lineInput} placeholder="Any" value={i.brand ?? ""} onChange={(e) => set({ brand: e.target.value || undefined })} autoFocus />
            </label>
          )}
          {f.extras.includes("other") && (
            <label className="flex flex-col gap-1.5">
              <span className={label}>Other names</span>
              <input className={lineInput} placeholder="e.g. oat drink" value={f.otherNames} onChange={(e) => setF((s) => ({ ...s, otherNames: e.target.value }))} autoFocus />
              <span className={hint}>Used to match recipes and in search.</span>
            </label>
          )}
          {f.extras.includes("notes") && (
            <label className="flex flex-col gap-1.5">
              <span className={label}>Notes</span>
              <textarea rows={3} className={cn("resize-y rounded-[4px] border border-[var(--line-strong)] bg-transparent p-2.5 text-[15px] leading-[21px] outline-none placeholder:text-[#8A7868] focus-visible:border-primary")} placeholder="Anything worth remembering" value={i.notes ?? ""} onChange={(e) => set({ notes: e.target.value || undefined })} autoFocus />
            </label>
          )}
          {f.extras.length < CHIPS.length && (
            <div className="flex flex-wrap gap-2">
              {CHIPS.filter((c) => !f.extras.includes(c.key)).map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setF((s) => ({ ...s, extras: [...s.extras, c.key] }))}
                  className={cn("inline-flex h-9 items-center gap-1.5 rounded-full border border-dashed border-primary bg-background px-3.5 text-[13px] text-foreground hover:bg-muted", focus)}
                >
                  <PlusIcon aria-hidden className="size-3" strokeWidth={2.5} />
                  {c.label}
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </PanelShell>
  )
}

/** "1 bag", "2 bags"; with no unit, "1" reads as the item: "1 lemon". */
function unitText2(i: Item, n: number) {
  if (i.unit) return `${n} ${n === 1 ? i.unit[0] : i.unit[1]}`
  return amountOf(i, n)
}

function DateField({ value, onChange, focus: wantFocus, label: name }: { value: string; onChange: (v: string) => void; focus?: boolean; label?: string }) {
  const ref = React.useRef<HTMLInputElement>(null)
  React.useEffect(() => {
    if (wantFocus) ref.current?.focus()
  }, [wantFocus])
  return (
    <input
      ref={ref}
      type="date"
      aria-label={name}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn("h-10 rounded-[4px] border bg-background px-2 text-[15px] text-foreground", value ? "border-[var(--line-strong)]" : "border-primary", focus)}
    />
  )
}

// ---------- Edit (PANEL-H) ----------

type Group = "stock" | "where" | "store" | "notes" | "recipes" | "history"

function EditPanel({ item, onClose, onDeleted }: { item?: Item; onClose: () => void; onDeleted: (name: string) => void }) {
  const { db, actions } = usePantry()
  const [group, setGroup] = React.useState<Group | null>(null)
  const [renaming, setRenaming] = React.useState(false)
  const [nameDraft, setNameDraft] = React.useState("")
  const [menuOpen, setMenuOpen] = React.useState(false)
  const [confirmDelete, setConfirmDelete] = React.useState(false)
  const [merge, setMerge] = React.useState(false)
  const [editing, setEditing] = React.useState<{ index: number; value: string } | null>(null)
  const [notice, setNotice] = React.useState<{ text: string; undo?: Unit } | null>(null)
  const [stockNote, setStockNote] = React.useState("")
  // Bulk → Counted keeps which packs were open, so switching back restores them.
  const [wasOpen, setWasOpen] = React.useState<Pick<Item, "open" | "openedAt"> | null>(null)
  const [savedOnce, setSavedOnce] = React.useState(false)
  const deleteRef = React.useRef<HTMLButtonElement>(null)
  const menuRef = React.useRef<HTMLButtonElement>(null)

  React.useEffect(() => {
    if (confirmDelete) deleteRef.current?.focus()
  }, [confirmDelete])

  if (!item) return <PanelShell open={false} onClose={onClose} title="Item">{null}</PanelShell>
  const i = item
  const bulk = isBulk(i)
  const [one, many] = unitNames(i)
  const units = unitsOf(i)
  const n = units.length
  const openN = units.filter((u) => u.open).length
  const hasUseBy = !i.noExpiry
  const tagNames = tagsOf(i).map((t) => db.categories.find((c) => c.id === t)?.name).filter(Boolean)
  const key = `panel:${i.id}`

  const save = (next: Item, opts?: { title?: string; merge?: boolean }) => {
    actions.saveItem(normalise(next), false, { key: opts?.merge === false ? undefined : key, title: opts?.title })
    setSavedOnce(true)
  }
  const set = (patch: Partial<Item>) => save({ ...i, ...patch })

  // Header line: "2 bags · 1 open · soonest use by 12 Jan".
  const soonestDate = units.map((u) => u.useBy).filter((d): d is string => !!d).sort()[0]
  const summary = n === 0
    ? "None in stock"
    : [cap(unitText2(i, n)), openN ? `${openN} open` : null, hasUseBy && soonestDate ? `soonest use by ${dayText(soonestDate)}` : null].filter(Boolean).join(" · ")

  const unitLabel = (k: number) => `${cap(one)} ${k + 1}`
  const act = (k: number) => {
    const u = units[k]
    const name = unitLabel(k)
    setEditing(null)
    if (bulk && !u.open) {
      const { item: next, movedTo } = openUnit(i, k)
      save(next, { title: `Opened a ${one} of ${lower(i.name)}`, merge: false })
      setNotice({ text: movedTo ? `${name} opened, so use by is now ${dayText(movedTo)}.` : `${name} opened.` })
      return
    }
    const rest = units.filter((_, j) => j !== k)
    save({ ...withUnits(i, rest), uses: (i.uses ?? 0) + 1 }, { title: bulk ? `Finished a ${one} of ${lower(i.name)}` : `Used ${amountOf(i, 1)}`, merge: false })
    setNotice({ text: `${name} ${bulk ? "finished" : "used"}.`, undo: u })
  }
  const undoRemove = () => {
    if (!notice?.undo) return
    save(withUnits(i, [...units, notice.undo]), { title: `Put back ${amountOf(i, 1)}`, merge: false })
    setNotice(null)
  }
  const addUnit = () => {
    const next = withUnits(i, [...units, { open: false, useBy: null, openedAt: null }])
    save(next, { title: `Added ${amountOf(i, 1)}`, merge: false })
    // Undated units sort last, so the new one is at the end.
    if (hasUseBy) setEditing({ index: next.inStock - 1, value: "" })
    setNotice({ text: hasUseBy ? "Added. Set its use-by date." : "Added, bought today." })
  }
  const commitDate = () => {
    if (!editing) return
    const u = units[editing.index]
    if (u && (editing.value || null) !== u.useBy) {
      save(withUnits(i, units.map((x, j) => (j === editing.index ? { ...x, useBy: editing.value || null } : x))), { title: `Changed a use-by date for ${i.name}` })
    }
    setEditing(null)
  }

  const setType = (type: Item["type"]) => {
    if (type === i.type) return
    if (type === "counted") {
      setStockNote(openN ? `Your ${openN === 1 ? `open ${one} now counts` : `${openN} open ${many} now count`} as whole. Switch back to keep tracking ${openN === 1 ? "it" : "them"}.` : "")
      setWasOpen(openN ? { open: i.open, openedAt: i.openedAt } : null)
      set({ type, open: undefined, openedAt: undefined })
    } else {
      setStockNote("")
      set({ type, ...(wasOpen ?? { open: 0 }) })
      setWasOpen(null)
    }
  }

  const toggle = (g: Group) => {
    setGroup((cur) => (cur === g ? null : g))
    setMenuOpen(false)
  }

  // Every store, with this item's aisle there when it has one.
  const stores = db.stores.map((s) => {
    const aisle = itemAisle(i, s)
    return { id: s.id, name: s.name, label: aisle !== null ? `${s.name} · ${aisleTitle(aisle)}` : s.name }
  })
  const store = stores.find((s) => s.id === i.where[0])
  const priceSummary = i.price ? `${money(i.price)}${i.priceEstimate ? " (estimate)" : ""}` : "No price"
  const usedIn = recipesUsing(db.recipes, i.id)
  const last = db.history.find((h) => h.itemIds?.includes(i.id))
  const sortHint = n > 1 ? (bulk ? "Open first, then soonest use-by" : hasUseBy ? "Soonest use-by first" : "") : ""
  const soon = (iso: string) => daysUntil(iso) <= 14
  const weeks = i.useWithinWeeks ?? 0

  return (
    <>
      <PanelShell
        open
        onClose={onClose}
        title={i.name}
        footer={
          <div className="flex h-[52px] shrink-0 items-center gap-2 border-t border-border px-8 text-[13px] text-muted-foreground">
            <CheckIcon aria-hidden className="size-3.5" />
            <span role="status">{savedOnce ? "Saved just now. Changes save as you go." : "Changes save as you go."}</span>
          </div>
        }
      >
        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-8 pt-6 pb-8">
          <div className="flex items-start gap-2">
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <SmallLabel>{[locationLabel(i.location), ...tagNames].filter(Boolean).join(" · ")}</SmallLabel>
              {renaming ? (
                <form
                  className="flex items-center gap-2"
                  onSubmit={(e) => {
                    e.preventDefault()
                    const v = nameDraft.trim()
                    if (v && v !== i.name) save({ ...i, name: v }, { title: `Renamed ${i.name} to ${v}`, merge: false })
                    setRenaming(false)
                    setTimeout(() => menuRef.current?.focus(), 0)
                  }}
                >
                  <input
                    aria-label="Item name"
                    autoFocus
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Escape" && (e.stopPropagation(), setRenaming(false))}
                    className="h-11 min-w-0 flex-1 border-0 border-b-2 border-primary bg-transparent px-0.5 font-serif text-[28px] font-bold outline-none"
                  />
                  <button type="submit" className={cn(primaryButton, focus)}>Done</button>
                </form>
              ) : (
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="font-serif text-[30px] leading-[1.05] font-bold break-words">{i.name}</h2>
                  {isStaple(i) && (
                    <span className="inline-flex h-5 items-center rounded-full border border-border bg-muted px-2 text-[10px] font-semibold tracking-[0.1em] uppercase">Staple</span>
                  )}
                </div>
              )}
              <span className="text-[15px] leading-5">{summary}</span>
            </div>
            <Popover open={menuOpen} onOpenChange={setMenuOpen}>
              <PopoverTrigger asChild>
                <IconButton ref={menuRef} label="More actions" aria-haspopup="menu"><EllipsisIcon /></IconButton>
              </PopoverTrigger>
              <PopoverContent align="end" className="flex w-60 flex-col gap-0 rounded-[4px] border-border bg-background p-1.5 shadow-[0_8px_24px_rgba(61,43,31,0.14)]">
                <div role="menu" aria-label="More actions" className="flex flex-col">
                  <button type="button" role="menuitem" className={cn("h-10 rounded-[4px] px-3 text-left text-sm hover:bg-muted", focus)} onClick={() => { setMenuOpen(false); setNameDraft(i.name); setRenaming(true) }}>Rename</button>
                  <button type="button" role="menuitem" className={cn("h-10 rounded-[4px] px-3 text-left text-sm hover:bg-muted", focus)} onClick={() => { setMenuOpen(false); setMerge(true) }}>Merge with another item</button>
                  <button type="button" role="menuitem" className={cn("h-10 rounded-[4px] border-t border-border px-3 text-left text-sm text-destructive hover:bg-muted", focus)} onClick={() => { setMenuOpen(false); setConfirmDelete(true) }}>Delete</button>
                </div>
              </PopoverContent>
            </Popover>
            <IconButton label="Close" onClick={onClose}><XIcon /></IconButton>
          </div>

          {confirmDelete && (
            <div role="alertdialog" aria-labelledby="delete-q" aria-describedby="delete-why" className="flex flex-col gap-3 rounded-[4px] border border-destructive p-4">
              <span id="delete-q" className="text-[15px] font-semibold">Delete {i.name}{n ? ` and its ${unitText2(i, n)}` : ""}?</span>
              <span id="delete-why" className="text-sm text-muted-foreground">
                Recipes that use it will show it as missing{needOf(i) > 0 ? ", and it comes off the shopping list" : ""}. You can undo it from History today.
              </span>
              <div className="flex gap-2">
                <button type="button" className={cn(quietButton, focus)} onClick={() => { setConfirmDelete(false); setTimeout(() => menuRef.current?.focus(), 0) }}>Keep it</button>
                <button
                  ref={deleteRef}
                  type="button"
                  className={cn("h-10 rounded-[4px] border border-destructive bg-destructive px-4 text-xs font-semibold tracking-[0.1em] text-destructive-foreground uppercase hover:bg-destructive/90", focus)}
                  onClick={() => {
                    actions.deleteItem(i.id)
                    onDeleted(i.name)
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          )}

          <ListBoxView box={listBox(i)} />

          <section aria-labelledby="units-h" className="flex flex-col gap-2.5">
            <div className="flex items-baseline justify-between">
              <h3 id="units-h"><SmallLabel>{cap(many)}</SmallLabel></h3>
              {sortHint && <span className="text-xs text-muted-foreground">{sortHint}</span>}
            </div>
            {n > 0 ? (
              <ul className="border-t border-border">
                {units.map((u, k) => {
                  const name = unitLabel(k)
                  const actLabel = bulk ? (u.open ? "Finished" : "Open it") : "Used it"
                  return (
                    <li key={k} className="flex min-h-[60px] items-center gap-3 border-b border-border py-2">
                      <span className="w-16 shrink-0 text-sm font-semibold">{name}</span>
                      {bulk && (
                        <span className={cn("inline-flex h-5 shrink-0 items-center rounded-full border border-primary px-2 text-[10px] font-semibold tracking-[0.1em] uppercase", u.open ? "bg-primary text-primary-foreground" : "bg-background")}>
                          {u.open ? "Open" : "Full"}
                        </span>
                      )}
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        {!hasUseBy ? (
                          <span className="text-sm text-muted-foreground">{u.openedAt ? `Opened ${dayText(u.openedAt)}` : "No use-by date"}</span>
                        ) : editing?.index === k ? (
                          <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); commitDate() }}>
                            <input
                              type="date"
                              aria-label={`Use-by date for ${name}`}
                              autoFocus
                              value={editing.value}
                              onChange={(e) => setEditing({ index: k, value: e.target.value })}
                              onKeyDown={(e) => e.key === "Escape" && (e.stopPropagation(), setEditing(null))}
                              className={cn("h-9 rounded-[4px] border border-primary bg-background px-1.5 text-sm", focus)}
                            />
                            <button type="submit" className={cn(primaryButton, "h-9 px-3", focus)}>Done</button>
                          </form>
                        ) : (
                          <button
                            type="button"
                            aria-label={`Change use-by date for ${name}, now ${u.useBy ? dayText(u.useBy) : "not set"}`}
                            onClick={() => setEditing({ index: k, value: u.useBy ?? "" })}
                            className={cn("border-b border-dashed border-[var(--line-strong)] py-1 text-left text-sm", u.useBy ? "text-foreground" : "text-muted-foreground", u.useBy && soon(u.useBy) && "font-bold", focus)}
                          >
                            {u.useBy ? `Use by ${dayText(u.useBy)}` : "Set use-by date"}
                          </button>
                        )}
                      </div>
                      <button type="button" aria-label={`${actLabel}: ${name}`} onClick={() => act(k)} className={cn("h-9 shrink-0 rounded-[4px] border border-primary bg-background px-3.5 text-xs font-semibold tracking-[0.1em] uppercase hover:bg-muted", focus)}>
                        {actLabel}
                      </button>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <div className="flex flex-col gap-1 rounded-[4px] border border-dashed border-[var(--line-strong)] px-4 py-5">
                <span className="text-[15px] font-semibold">No {many} left</span>
                <span className="text-sm text-muted-foreground">{isStaple(i) ? `${i.name} is on the shopping list.` : "It isn't a Staple, so it won't go on the list by itself."}</span>
              </div>
            )}
            <div className="flex min-h-10 items-center justify-between gap-3">
              <button type="button" onClick={addUnit} className={cn(quietButton, "inline-flex items-center gap-2", focus)}>
                <PlusIcon aria-hidden className="size-3.5" />
                {i.unit ? `Add a ${one}` : "Add one"}
              </button>
              <span role="status" className="flex items-center gap-2.5 text-right text-[13px] text-muted-foreground">
                {notice?.text}
                {notice?.undo && <button type="button" className={cn("text-[13px] font-semibold text-foreground underline", focus)} onClick={undoRemove}>Undo</button>}
              </span>
            </div>
          </section>

          <section aria-label="Details" className="flex flex-col border-t border-primary">
            <Fold
              title="Stock rules"
              open={group === "stock"}
              onToggle={() => toggle("stock")}
              summary={`Minimum ${i.target} · ${bulk ? "Bulk" : "Counted"} · ${many}${i.packSize ? ` of ${sizeText(i)}` : ""}`}
            >
              <StepRow title="Minimum to keep" sub={i.target > 0 ? "Above 0 makes it a Staple, so it goes on the list by itself." : "At 0 it isn't a Staple."}>
                <Counter value={i.target} onChange={(target) => set({ target })} label="Minimum to keep" less="Lower minimum" more="Raise minimum" />
              </StepRow>
              <div className="flex flex-col gap-2">
                <span className={label}>How you use it</span>
                <TwoWay label="How you use it" value={i.type} onChange={setType} options={[{ value: "counted", label: "Counted" }, { value: "bulk", label: "Bulk" }]} />
                <span className={hint}>{typeExplain(i, false)}</span>
                {stockNote && <span className="text-[13px] leading-[18px] font-semibold">{stockNote}</span>}
              </div>
              <div className="flex flex-wrap gap-5">
                <UnitField unit={i.unit} onChange={(unit) => set({ unit })} />
                <SizeField item={i} onChange={(packSize) => set({ packSize })} />
              </div>
              <StepRow id="edit-useby" title="Has a use-by date" sub={hasUseBy ? `Each ${one} has its own date.` : `Off, so no use-by dates are kept.`}>
                <Toggle labelledBy="edit-useby" on={hasUseBy} onChange={(on) => { setEditing(null); set(on ? { noExpiry: undefined } : { noExpiry: true, useBy: [] }) }} />
              </StepRow>
              {bulk && hasUseBy && (
                <StepRow
                  title="Use within, once open"
                  sub={weeks
                    ? `When you open a ${one}, its use-by becomes the printed date or ${plural(weeks, "week")} from opening, whichever is sooner.`
                    : `Off, so opening a ${one} doesn't change its use-by date.`}
                >
                  <Counter
                    size="md"
                    value={weeks}
                    max={52}
                    onChange={(w) => set({ useWithinWeeks: w || undefined })}
                    label="Weeks to use within once open"
                    less="Fewer weeks"
                    more="More weeks"
                    format={(w) => (w ? plural(w, "week") : "Off")}
                  />
                </StepRow>
              )}
            </Fold>

            <Fold title="Where it lives" open={group === "where"} onToggle={() => toggle("where")} summary={[locationLabel(i.location), tagNames.length ? tagNames.join(", ") : "No tags"].join(" · ")}>
              <div className="flex flex-col gap-2">
                <span className={label}>Location</span>
                <LocationPicker value={i.location} onChange={(location) => set({ location })} />
              </div>
              <div className="flex flex-col gap-2">
                <span className={label}>Tags</span>
                <TagPicker value={tagsOf(i)} onChange={(tags) => save(withTags(i, tags))} />
                <span className={hint}>Labels for finding and filtering. They don't set the aisle.</span>
              </div>
            </Fold>

            <Fold title="Store, price, brand" open={group === "store"} onToggle={() => toggle("store")} summary={[store?.name ?? "Any store", priceSummary, i.brand || "Any brand"].join(" · ")}>
              <label className="flex flex-col gap-1.5">
                <span className={label}>Store</span>
                <select className={lineInput} value={store?.id ?? "any"} onChange={(e) => set({ where: e.target.value === "any" ? [] : [e.target.value] })}>
                  <option value="any">Any store</option>
                  {stores.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
                <span className={hint}>Any store puts it on every store's shopping list. Choose one to keep it to that store.</span>
              </label>
              <AislePickers item={i} onChange={(storeId, a) => save(withAisle(i, storeId, a))} />
              <label className="flex flex-col gap-1.5">
                <span className={label}>Last bought</span>
                <input type="date" className={cn(lineInput, "w-48", !i.boughtAt && "text-muted-foreground")} value={i.boughtAt ?? ""} max={todayIso()} onChange={(e) => save({ ...i, boughtAt: e.target.value || undefined })} />
                <span className={hint}>Set by itself when you tick it off or add stock.</span>
              </label>
              <div className="flex gap-5">
                <label className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <span className={label}>Price each</span>
                  <span className="flex items-center gap-1 border-b border-[var(--line-strong)] focus-within:border-primary">
                    <span aria-hidden className="text-base text-muted-foreground">£</span>
                    <BlurInput
                      className={cn(lineInput, "border-0")}
                      inputMode="decimal"
                      value={penceText(i.price)}
                      onCommit={(v) => {
                        const price = parsePence(v)
                        // A price you set yourself isn't an estimate. Leaving it as it was keeps the mark.
                        if (price !== i.price) set({ price, priceEstimate: undefined })
                      }}
                    />
                  </span>
                  {i.priceEstimate && i.price ? <span className={hint}>Estimated by Claude. Change it if you know the real price.</span> : null}
                </label>
                <label className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <span className={label}>Preferred brand</span>
                  <BlurInput className={lineInput} placeholder="Any" value={i.brand ?? ""} onCommit={(v) => v.trim() !== (i.brand ?? "") && set({ brand: v.trim() || undefined })} />
                </label>
              </div>
            </Fold>

            <Fold
              title="Notes, other names"
              open={group === "notes"}
              onToggle={() => toggle("notes")}
              summary={i.otherNames?.length ? `Also called ${i.otherNames.join(", ")}` : i.notes ? "Has a note" : "None yet"}
            >
              <label className="flex flex-col gap-1.5">
                <span className={label}>Other names</span>
                <BlurInput
                  className={lineInput}
                  placeholder="e.g. all-purpose flour"
                  value={(i.otherNames ?? []).join(", ")}
                  onCommit={(v) => {
                    const names = splitNames(v)
                    if (names.join(",") !== (i.otherNames ?? []).join(",")) set({ otherNames: names.length ? names : undefined })
                  }}
                />
                <span className={hint}>Used to match recipes and in search. Separate them with commas.</span>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={label}>Notes</span>
                <BlurInput
                  multiline
                  className="resize-y rounded-[4px] border border-[var(--line-strong)] bg-transparent p-2.5 text-[15px] leading-[21px] outline-none placeholder:text-[#8A7868] focus-visible:border-primary"
                  placeholder="Anything worth remembering"
                  value={i.notes ?? ""}
                  onCommit={(v) => v !== (i.notes ?? "") && set({ notes: v || undefined })}
                />
              </label>
            </Fold>

            <Fold title="Recipes" open={group === "recipes"} onToggle={() => toggle("recipes")} summary={usedIn.length ? `Used in ${plural(usedIn.length, "recipe")}` : "None yet"}>
              {usedIn.length ? (
                <ul className="-my-3 flex flex-col gap-1">
                  {usedIn.map((r) => (
                    <li key={r.id} className="flex justify-between gap-4 py-2 text-sm">
                      <a className={cn("underline underline-offset-4 hover:text-primary", focus)} href={`#/recipes/cook/${r.id}`}>{r.name}</a>
                      <span className="text-right text-muted-foreground">{r.ingredients.find((g) => g.itemId === i.id)?.text}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="-my-3 text-sm text-muted-foreground">No recipe uses it yet.</span>
              )}
            </Fold>

            <Fold title="History" open={group === "history"} onToggle={() => toggle("history")} summary={last ? `${last.title} · ${whenText(last.at)}` : "No changes yet"}>
              <div className="-my-3 flex flex-col gap-2">
                {last && (
                  <div className="flex justify-between gap-4 py-2 text-sm">
                    <span>{last.title}{last.detail ? <span className="text-muted-foreground"> · {last.detail}</span> : null}</span>
                    <span className="shrink-0 text-muted-foreground">{whenText(last.at)}</span>
                  </div>
                )}
                <a className={cn("self-start text-sm font-semibold underline underline-offset-4 hover:text-primary", focus)} href="#/">See full history</a>
              </div>
            </Fold>
          </section>
        </div>
      </PanelShell>
      <MergeDialog open={merge} onOpenChange={setMerge} keepId={i.id} onDone={onClose} />
    </>
  )
}

/** A text field that saves when you leave it (or press Enter), so typing doesn't save every letter. */
function BlurInput({ value, onCommit, multiline, ...props }: Omit<React.ComponentProps<"input">, "value" | "onChange"> & { value: string; onCommit: (v: string) => void; multiline?: boolean }) {
  const [text, setText] = React.useState(value)
  const [last, setLast] = React.useState(value)
  if (value !== last) {
    setLast(value)
    setText(value)
  }
  const common = {
    value: text,
    onBlur: () => onCommit(text),
    className: props.className,
    placeholder: props.placeholder,
  }
  if (multiline) return <textarea rows={3} {...common} onChange={(e) => setText(e.target.value)} />
  return <input {...props} {...common} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && onCommit(text)} />
}

// ---------- PAN-17 merge ----------

export function MergeDialog({ open, onOpenChange, keepId, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; keepId: string; onDone: () => void }) {
  const { items, db, actions, state } = usePantry()
  const others = Object.values(items).filter((i) => !i.oneOff && i.id !== keepId).sort((a, b) => a.name.localeCompare(b.name))
  // Suggest an item with a similar name: "Milk" for "Whole milk".
  const suggested = others.find((o) => items[keepId] && (items[keepId].name.toLowerCase().includes(o.name.toLowerCase()) || o.name.toLowerCase().includes(items[keepId].name.toLowerCase())))
  const [pair, setPair] = React.useState<{ keep: string; gone: string | undefined }>({ keep: keepId, gone: suggested?.id })
  const [lastKeep, setLastKeep] = React.useState(keepId)
  if (keepId !== lastKeep) {
    setLastKeep(keepId)
    setPair({ keep: keepId, gone: suggested?.id })
  }
  const keep = items[pair.keep]
  const gone = pair.gone ? items[pair.gone] : undefined
  if (!keep) return null

  const recipesOf = (i: Item) => recipesUsing(db.recipes, i.id)
  const created = gone && state.db.history.find((h) => h.itemIds?.includes(gone.id) && h.who === "claude")
  const row = (label: string, a: React.ReactNode, b: React.ReactNode, after: React.ReactNode, note?: string) => (
    <div className="grid grid-cols-[140px_1fr_1fr_1.2fr] gap-4 border-b border-border py-3 text-sm">
      <Eyebrow className="pt-0.5">{label}</Eyebrow>
      <span>{a}</span>
      <span className="text-muted-foreground">{b}</span>
      <span className="flex flex-col"><strong className="font-semibold">{after}</strong>{note && <span className="text-xs text-muted-foreground">{note}</span>}</span>
    </div>
  )
  const stock = (i?: Item) => (i ? (i.inStock ? haveText(i) : "0") : "–")
  const dates = (i?: Item) => (i?.useBy ?? []).filter(Boolean).map((d) => dateText(d)).join(", ") || "–"
  const merged = gone && normalise({ ...keep, inStock: keep.inStock + gone.inStock, open: isBulk(keep) ? (keep.open ?? 0) + (gone.open ?? 0) : undefined, useBy: [...(keep.useBy ?? []), ...(gone.useBy ?? [])].sort((x, y) => (x ?? "9").localeCompare(y ?? "9")) })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-6 p-8 sm:max-w-[920px]">
        <DialogHeader>
          <Eyebrow>Merge two items</Eyebrow>
          <DialogTitle className="text-[22px] tracking-[0.04em] uppercase">{gone ? `Merge ${gone.name} into ${keep.name}` : `Merge into ${keep.name}`}</DialogTitle>
          <DialogDescription className="sr-only">Pick the item to keep and the one to merge in.</DialogDescription>
        </DialogHeader>
        <div className="flex items-end gap-4">
          <Field label="Keep" className="flex-1">
            <Input value={keep.name} readOnly />
          </Field>
          <Button variant="outline" size="icon" aria-label="Swap sides" title="Swap sides" disabled={!gone} onClick={() => gone && setPair({ keep: gone.id, gone: keep.id })}>
            <ArrowLeftRightIcon />
          </Button>
          <Field label="Merge in" className="flex-1">
            <Select value={pair.gone} onValueChange={(v) => setPair({ ...pair, gone: v })}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Choose an item" /></SelectTrigger>
              <SelectContent>
                {others.filter((o) => o.id !== pair.keep).map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>
        {gone && created && <p className="-mt-2 text-[13px] text-muted-foreground">{gone.name}: {created.title.toLowerCase().startsWith("saved") ? `created by Claude (${created.title.replace(/^Saved /, "")})` : created.title}. Swap the sides to keep {gone.name} instead.</p>}
        {gone && merged && (
          <div className="flex flex-col">
            <div className="grid grid-cols-[140px_1fr_1fr_1.2fr] gap-4 border-b border-primary pb-2 text-[10px] font-semibold tracking-widest uppercase">
              <span />
              <span>{keep.name}</span>
              <span className="text-muted-foreground">{gone.name}</span>
              <span>After merging</span>
            </div>
            {row("Stock", stock(keep), stock(gone), stock(merged), "Stock is added together")}
            {row("Minimum", `${keep.target}${isStaple(keep) ? " · Staple" : ""}`, gone.target, `${Math.max(keep.target, gone.target)}${Math.max(keep.target, gone.target) > 0 ? " · Staple" : ""}`, "The higher minimum is kept")}
            {row("Use-by dates", dates(keep), dates(gone), dates(merged))}
            {row("Other names", (keep.otherNames ?? []).join(", ") || "–", (gone.otherNames ?? []).join(", ") || "–", [...new Set([...(keep.otherNames ?? []), gone.name, ...(gone.otherNames ?? [])])].join(", "), `So recipes that say ${gone.name.toLowerCase()} match it`)}
            {row("Recipes", recipesOf(keep).length, recipesOf(gone).length ? `${recipesOf(gone).length} · ${recipesOf(gone).map((r) => r.name).join(", ")}` : 0, plural(new Set([...recipesOf(keep), ...recipesOf(gone)].map((r) => r.id)).size, "recipe"), recipesOf(gone).length ? `${nameList(recipesOf(gone).map((r) => r.name))} now ${recipesOf(gone).length === 1 ? "links" : "link"} to ${keep.name}` : undefined)}
            {row("Tags, price, brand", [tagsOf(keep).map((t) => db.categories.find((c) => c.id === t)?.name).filter(Boolean).join(", "), keep.price && money(keep.price), keep.brand].filter(Boolean).join(" · ") || "–", [db.categories.find((c) => c.id === gone.categoryId)?.name, gone.price && money(gone.price), gone.brand].filter(Boolean).join(" · ") || "–", `Kept from ${keep.name}`)}
            {(entryTotal(keep) > 0 || entryTotal(gone) > 0) && row("Shopping list", needOf(keep) || "–", needOf(gone) || "–", "Both list entries are kept")}
          </div>
        )}
        <p className="text-[13px] text-muted-foreground">{gone ? `${gone.name} is removed. ` : ""}You can undo this from History today.</p>
        <DialogFooter className="sm:justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={!gone}
            onClick={() => {
              if (!gone) return
              actions.mergeItems(keep.id, gone.id)
              onOpenChange(false)
              onDone()
              navigate({ name: "pantry", item: keep.id })
            }}
          >
            Merge into {keep.name}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

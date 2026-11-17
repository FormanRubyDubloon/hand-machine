// Pieces the pantry app needs that the design system doesn't have. HANDOFF.md marks them "new":
// built here, not in src/components/ui. Ask Isaac before promoting any of them.
import * as React from "react"
import { CheckIcon, MinusIcon, PlusIcon, Undo2Icon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { fullOf, stockOf, whenText, type HistoryEntry, type IngredientStatus, type Item, type Who } from "./model"

// ---------- type ----------

/** 10px uppercase label. */
export function Eyebrow({ className, children }: { className?: string; children: React.ReactNode }) {
  return <span className={cn("text-[10px] font-semibold tracking-widest text-muted-foreground uppercase", className)}>{children}</span>
}

/** 30px uppercase page title with an optional line under it. */
export function PageTitle({ title, subtitle, children }: { title: React.ReactNode; subtitle?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-1.5">
        <h1 className="type-title text-3xl leading-none font-semibold tracking-[0.04em] uppercase">{title}</h1>
        {subtitle && <p className="text-[13px] text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

export function SectionTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h2 className={cn("text-[22px] leading-tight font-semibold", className)}>{children}</h2>
}

// ---------- pills ----------

/** What the Status column means, for a tooltip. */
export const statusHelp = "Out: none in stock. Low: half the minimum or fewer. A Staple under its minimum but above half goes on the shopping list without a status."

/** Out (solid) or Low (outlined), from the stock. Nothing when it's fine. The tooltip says why. */
export function StockPill({ item }: { item: Item }) {
  const s = stockOf(item)
  if (!s) return null
  const tip = s === "out" ? `None in stock. The minimum is ${item.target}.` : `${fullOf(item)} of ${item.target} count towards the minimum. Low is half the minimum or fewer.`
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0} className="inline-flex outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
            <Badge variant={s === "out" ? "solid" : "outlined"}>{s === "out" ? "Out" : "Low"}</Badge>
          </span>
        </TooltipTrigger>
        <TooltipContent>{tip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/** A column heading with a tooltip. The dotted underline shows there's more to read. */
export function HeadingTip({ label, tip }: { label: string; tip: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0} className="cursor-help underline decoration-dotted underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring/50">{label}</span>
        </TooltipTrigger>
        <TooltipContent className="max-w-64">{tip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/** Grey rounded pill: Staple, Recipe, Claude, One-off. */
export function TagPill({ children, className }: { children: React.ReactNode; className?: string }) {
  return <Badge className={cn("h-5 rounded-full border border-border bg-muted px-2 text-foreground", className)}>{children}</Badge>
}

/** The New pill: gold, with a tooltip saying why. For an ingredient not in the pantry yet, and an item made from a shop. */
export function NewPill({ tip }: { tip: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            tabIndex={0}
            className="inline-flex h-6 items-center gap-1.5 rounded-full border border-[#7A6840] bg-[#C2A86A] px-2.5 text-[10px] font-semibold tracking-[0.1em] text-[#2A1D15] uppercase shadow-[0_0_8px_rgb(194_168_106/0.6)]"
          >
            <span className="size-1.5 rounded-full bg-[#2A1D15]" aria-hidden="true" />
            New
          </span>
        </TooltipTrigger>
        <TooltipContent>{tip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// ---------- stepper ----------

/** −, number, +. 28px in tables, 40px in panels. */
export function Stepper({
  value,
  onChange,
  min = 0,
  max,
  size = "sm",
  label,
  className,
}: {
  value: number
  onChange: (n: number) => void
  min?: number
  max?: number
  size?: "sm" | "md"
  label: string
  className?: string
}) {
  const box = size === "sm" ? "size-7" : "size-10"
  return (
    <div role="group" aria-label={label} className={cn("inline-flex items-center", className)}>
      <Button
        type="button"
        variant="outline"
        className={cn(box, "p-0")}
        aria-label={`Less ${label.toLowerCase()}`}
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
      >
        <MinusIcon className={size === "sm" ? "size-3" : "size-4"} />
      </Button>
      <span className={cn("text-center font-semibold tabular-nums", size === "sm" ? "w-8 text-sm" : "w-12 text-xl")} aria-live="polite">
        {value}
      </span>
      <Button
        type="button"
        variant="outline"
        className={cn(box, "p-0")}
        aria-label={`More ${label.toLowerCase()}`}
        disabled={max !== undefined && value >= max}
        onClick={() => onChange(value + 1)}
      >
        <PlusIcon className={size === "sm" ? "size-3" : "size-4"} />
      </Button>
    </div>
  )
}

// ---------- segmented ----------

/** A pick-one row of square buttons (Type, Location, Default store). */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  size = "default",
  className,
}: {
  value: T | undefined
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  label: string
  size?: "default" | "sm"
  className?: string
}) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      spacing={0}
      value={value ?? ""}
      onValueChange={(v) => v && onChange(v as T)}
      aria-label={label}
      className={cn("w-full", className)}
    >
      {options.map((o) => (
        <ToggleGroupItem
          key={o.value}
          value={o.value}
          size={size}
          className="flex-1 border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
        >
          {o.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

// ---------- form field ----------

export function Field({ label, children, className, hint }: { label: string; children: React.ReactNode; className?: string; hint?: React.ReactNode }) {
  const id = React.useId()
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      <label htmlFor={id} className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
        {label}
      </label>
      {React.isValidElement(children) ? React.cloneElement(children as React.ReactElement<{ id?: string }>, { id }) : children}
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  )
}

// ---------- filter sidebar ----------

export type FilterOption<T extends string> = { value: T; label: string; count: number; icon?: React.ReactNode }

/** One group in the filter sidebar. Click again to clear unless `required`. */
export function FilterGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  required,
}: {
  label: string
  options: FilterOption<T>[]
  value: T | null
  onChange: (v: T | null) => void
  required?: boolean
}) {
  return (
    <div className="flex flex-col gap-1" role="group" aria-label={label}>
      <Eyebrow className="px-3 pb-1">{label}</Eyebrow>
      {options.map((o) => {
        const on = value === o.value
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on && !required ? null : o.value)}
            className={cn(
              "flex h-9 items-center justify-between px-3 text-left text-sm transition-colors outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50",
              on && "bg-muted font-semibold",
            )}
          >
            <span className="flex min-w-0 items-center gap-2">{o.icon}<span className="truncate">{o.label}</span></span>
            <span className="font-normal text-muted-foreground tabular-nums">{o.count}</span>
          </button>
        )
      })}
    </div>
  )
}

export function FilterSidebar({ children, footer }: { children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <aside className="flex w-60 shrink-0 flex-col gap-5 overflow-y-auto border-r border-border px-5 py-6">
      {children}
      {footer && <div className="mt-auto pt-4 text-xs text-muted-foreground">{footer}</div>}
    </aside>
  )
}

// ---------- side panel ----------

/** A right-hand sheet over the page: 520 to 800px, a header, a scrolling body and a fixed footer. */
export function SidePanel({
  open,
  onClose,
  width = 560,
  eyebrow,
  title,
  badges,
  description,
  headerActions,
  footer,
  children,
}: {
  open: boolean
  onClose: () => void
  width?: number
  eyebrow?: React.ReactNode
  title: React.ReactNode
  badges?: React.ReactNode
  description?: React.ReactNode
  headerActions?: React.ReactNode
  footer?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        style={{ width, maxWidth: "100vw" }}
        className="gap-0 bg-background outline-none sm:max-w-none"
        // Don't drop the cursor into the first field: most of the time you're reading, not typing.
        onOpenAutoFocus={(e) => {
          e.preventDefault()
          ;(e.currentTarget as HTMLElement | null)?.focus()
        }}
        tabIndex={-1}
      >
        <div className="flex shrink-0 flex-col gap-2 border-b border-border px-8 pt-7 pb-5 pr-16">
          {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
          <div className="flex flex-wrap items-center gap-3">
            <SheetTitle className="text-[22px] leading-tight tracking-[0.04em]">{title}</SheetTitle>
            {badges}
          </div>
          {description ? <SheetDescription className="text-[13px]">{description}</SheetDescription> : <SheetDescription className="sr-only">Details</SheetDescription>}
          {headerActions && <div className="absolute top-4 right-16 flex gap-2">{headerActions}</div>}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-8 py-6">{children}</div>
        {footer && <div className="flex shrink-0 items-center gap-2 border-t border-border bg-background px-8 py-4">{footer}</div>}
      </SheetContent>
    </Sheet>
  )
}

// ---------- history ----------

export const whoLabel: Record<Who, string> = { you: "You", claude: "Claude", phone: "Shopping app" }

/** Where a History entry points: its title's link, and links to each item when there are several. */
export type HistoryLinks = { href?: string; items?: { href: string; label: string }[]; more?: number }

export function HistoryRow({ entry, onUndo, compact, links }: { entry: HistoryEntry; onUndo?: () => void; compact?: boolean; links?: HistoryLinks }) {
  const titleClass = cn("leading-snug font-semibold", compact ? "text-[13px]" : "text-sm", entry.undone && "line-through")
  return (
    <div className={cn("flex items-start gap-3 border-b border-border", compact ? "py-2.5" : "py-3", entry.undone && "opacity-50")}>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-baseline justify-between gap-2">
          <Eyebrow className="text-foreground">{whoLabel[entry.who]}</Eyebrow>
          <span className="shrink-0 text-xs text-muted-foreground">{entry.undone ? "Undone" : whenText(entry.at)}</span>
        </div>
        {links?.href ? (
          <a href={links.href} className={cn(titleClass, "self-start underline-offset-2 hover:underline")}>{entry.title}</a>
        ) : (
          <span className={titleClass}>{entry.title}</span>
        )}
        {entry.detail && <span className="text-xs text-muted-foreground">{entry.detail}</span>}
        {links?.items?.length ? (
          <span className="text-xs text-muted-foreground">
            {links.items.map((l, n) => (
              <React.Fragment key={l.href}>
                {n > 0 && ", "}
                <a href={l.href} className="text-foreground underline underline-offset-2">{l.label}</a>
              </React.Fragment>
            ))}
            {links.more ? ` and ${links.more} more` : null}
          </span>
        ) : null}
      </div>
      {onUndo && (
        <Button variant="outline" size="icon-xs" className="mt-4 shrink-0" aria-label={`Undo: ${entry.title}`} title="Undo" onClick={onUndo}>
          <Undo2Icon />
        </Button>
      )}
    </div>
  )
}

// ---------- unit and pack rows ----------

/** One unit or pack in the item panel: label, use-by, a sub-line, an action. Muted when the slot is empty. */
export function UnitRow({
  label,
  title,
  sub,
  aside,
  action,
  empty,
}: {
  label: string
  title: React.ReactNode
  sub?: React.ReactNode
  aside?: React.ReactNode
  action?: React.ReactNode
  empty?: boolean
}) {
  return (
    <div className={cn("flex min-h-14 items-center gap-4 border-b border-border px-3", empty ? "bg-muted text-muted-foreground" : "bg-background")}>
      <Eyebrow className="w-16 shrink-0">{label}</Eyebrow>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className={cn("text-sm", !empty && "font-semibold")}>{title}</span>
        {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
      </div>
      {aside && <span className="shrink-0 text-xs text-muted-foreground">{aside}</span>}
      {action}
    </div>
  )
}

// ---------- ingredient stock marks ----------

const statusLabel: Record<IngredientStatus, string> = {
  have: "Have it",
  some: "Have some",
  listed: "On your list",
  short: "Short",
  little: "Too little",
  unlinked: "Not in pantry",
}

/** Dark tick (have), light tick (some), solid pill (short), label (on your list). */
export function StockMark({ status, missing }: { status: IngredientStatus; missing?: number }) {
  if (status === "have" || status === "some")
    return <CheckIcon strokeWidth={2.5} className={cn("size-5 shrink-0", status === "some" && "text-ring")} aria-label={statusLabel[status]} />
  if (status === "listed") return <Eyebrow className="text-foreground">On your list</Eyebrow>
  if (status === "unlinked") return <Eyebrow>Not in pantry</Eyebrow>
  if (status === "little") return <Badge variant="solid">Too little</Badge>
  return <Badge variant="solid">{missing && missing > 1 ? `Short ${missing}` : "Short"}</Badge>
}

export { statusLabel }

// ---------- settings navigation ----------

export function NavRow({ title, sub, current, onClick }: { title: string; sub: string; current?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-current={current ? "page" : undefined}
      onClick={onClick}
      className={cn(
        "flex flex-col gap-0.5 border-l-2 px-4 py-3 text-left transition-colors outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50",
        current ? "border-primary bg-muted" : "border-transparent",
      )}
    >
      <span className="text-sm font-semibold">{title}</span>
      <span className="text-xs text-muted-foreground">{sub}</span>
    </button>
  )
}

// ---------- empty state ----------

export function Empty({ title, children, actions }: { title: string; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="flex max-w-lg flex-col gap-3 py-10">
      <SectionTitle>{title}</SectionTitle>
      <div className="text-sm text-muted-foreground">{children}</div>
      {actions && <div className="flex gap-2 pt-2">{actions}</div>}
    </div>
  )
}

/** "Sort  A–Z ⌄": one dropdown for the pantry and recipe tables. */
export function SortSelect<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as T)}>
      <SelectTrigger aria-label="Sort by" className="w-[190px]">
        <span className="text-muted-foreground">Sort</span>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

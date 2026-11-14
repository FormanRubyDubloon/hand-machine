// Pieces the shopping list needs that the design system doesn't have yet. HANDOFF.md marks them
// "new": built here, not in src/components/ui. See "Gaps found" in HANDOFF.md.
import * as React from "react"
import { AnimatePresence, motion } from "motion/react"
import { CheckIcon, ChevronRightIcon, PlusIcon, SmartphoneIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ListRow, ListRowText } from "@/components/ui/list-row"
import { plural, type IngredientStatus, type Recipe } from "./model"
import { SyncIcon } from "./layout"

/** Grey pill for an item that's only on the list because of a recipe. */
export function RecipePill() {
  return <Badge className="h-5 rounded-full border border-border bg-muted px-2 text-foreground">Recipe</Badge>
}

/** A grey panel with an optional small label and one sentence. */
export function InfoNote({
  label,
  icon: Icon,
  children,
  className,
}: {
  label?: string
  icon?: React.ComponentType<{ className?: string }>
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex items-start gap-3 border-b border-border bg-muted px-5 py-4", className)}>
      {Icon && <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />}
      <div className="flex flex-col gap-1">
        {label && <span className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">{label}</span>}
        <p className="text-sm leading-5">{children}</p>
      </div>
    </div>
  )
}

/** HOME-02: the last shop wasn't synced. Slides in and out. */
export function SyncReminder({
  show,
  store,
  changes,
  onSync,
}: {
  show: boolean
  store: string
  changes: number
  onSync: () => void
}) {
  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="shrink-0 overflow-hidden bg-primary text-primary-foreground"
        >
          <div className="flex items-center justify-between gap-4 px-5 py-4">
            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-[10px] font-semibold tracking-widest text-primary-foreground/70 uppercase">Last shop not synced</span>
              <span className="text-xl leading-tight font-medium">
                {store}, {plural(changes, "change")}
              </span>
              <span className="text-sm text-primary-foreground/70">Your pantry won't show what you bought until you sync.</span>
            </div>
            <Button variant="secondary" size="lg" className="shrink-0 border-primary-foreground bg-background text-foreground hover:bg-muted" onClick={onSync}>
              <SyncIcon className="size-4" />
              Sync
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** RECIPE-01 row: name, a line of detail, whether it's saved offline, and Can cook / Short. */
export function RecipeRow({
  recipe,
  detail,
  short,
  disabled,
  onOpen,
  index = 0,
}: {
  recipe: Recipe
  detail: string
  /** How many ingredients you're short of. 0 means you can cook it. */
  short: number
  disabled?: boolean
  onOpen: () => void
  index?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut", delay: Math.min(index, 6) * 0.03 }}
    >
      <ListRow asChild size="default" tone={disabled ? "quiet" : "default"} className="gap-3">
        <button type="button" disabled={disabled} onClick={onOpen}>
          <ListRowText
            title={recipe.name}
            titleSize="md"
            description={
              <span className="flex flex-col gap-1">
                <span>{detail}</span>
                {recipe.wantToCook && (
                  <span className="flex items-center gap-1.5 text-xs">
                    <SmartphoneIcon className="size-3" aria-hidden="true" />
                    Saved on this phone
                  </span>
                )}
                {disabled && <span className="text-xs">Needs signal</span>}
              </span>
            }
          />
          <Badge variant={short ? "outlined" : "solid"}>{short ? `Short ${short}` : "Can cook"}</Badge>
          <ChevronRightIcon className="size-4.5 shrink-0" aria-hidden="true" />
        </button>
      </ListRow>
    </motion.div>
  )
}

const statusLabel: Record<IngredientStatus, string> = {
  have: "Have it",
  some: "Have an open pack",
  listed: "On your list",
  short: "Not on your list",
}

/**
 * RECIPE-02 row: the recipe's wording, the pantry item and its stock, and on the right one of
 * On your list, a dark tick (have it), a light tick (open pack) or an Add button.
 * Rows you're short of get a grey fill and bold wording.
 */
export function IngredientRow({
  text,
  detail,
  status,
  onAdd,
}: {
  text: string
  detail: string
  status: IngredientStatus
  onAdd: () => void
}) {
  return (
    <ListRow className={cn("min-h-17 gap-3 py-3 transition-colors duration-300", status === "short" && "bg-muted")}>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={cn("text-lg leading-tight", status === "short" ? "font-semibold" : "font-medium")}>{text}</span>
        <span className="text-xs text-muted-foreground">{detail}</span>
      </div>
      <div className="flex min-w-24 shrink-0 justify-end">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={status}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
          >
            {status === "listed" ? (
              <span className="text-[10px] font-semibold tracking-widest uppercase">On your list</span>
            ) : status === "short" ? (
              <Button variant="outline" size="sm" className="border-primary bg-background" onClick={onAdd}>
                <PlusIcon />
                Add
              </Button>
            ) : (
              <CheckIcon
                strokeWidth={2.5}
                className={cn("size-5", status === "some" && "text-ring")}
                aria-label={statusLabel[status]}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </ListRow>
  )
}

import * as React from "react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { CountBox } from "@/components/ui/count-box"
import { ListRow, ListRowText } from "@/components/ui/list-row"

type ItemRowState = "to-get" | "partly-got" | "got" | "skipped"
type StockStatus = "out" | "low"

/**
 * A shopping item: name, stock pill, sub-line and a count box.
 * The name and the count box are separate buttons: the name opens the row's
 * editor (`onNameClick`), the count box checks off everything (`onCountClick`).
 * Wrap in SwipeRow for swipes.
 */
function ItemRow({
  className,
  name,
  description,
  stock,
  state = "to-get",
  remaining,
  expanded,
  onNameClick,
  onCountClick,
  countLabel,
  ...props
}: Omit<React.ComponentProps<"div">, "name"> & {
  name: string
  description?: React.ReactNode
  stock?: StockStatus | null
  state?: ItemRowState
  /** How many are still to get. Shown in the count box. */
  remaining?: number
  /** Whether the row's editor is open. Sets aria-expanded on the name button. */
  expanded?: boolean
  onNameClick?: () => void
  onCountClick?: () => void
  /** Accessible name for the count button. */
  countLabel?: string
}) {
  const got = state === "got"
  const skipped = state === "skipped"
  // A fully bought item loses its pill. A skipped one keeps it.
  const pill = stock && !got ? stock : null

  return (
    <ListRow tone={skipped ? "muted" : "default"} className={cn("gap-0", className)} data-state={state} {...props}>
      <button
        type="button"
        aria-expanded={expanded}
        onClick={onNameClick}
        className="flex min-h-21 min-w-0 flex-1 items-center self-stretch text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset"
      >
        <ListRowText
          title={
            <span className="flex items-center gap-2">
              <span className={cn((got || skipped) && "line-through", got && "text-muted-foreground")}>
                {name}
              </span>
              {pill && (
                <Badge variant={pill === "out" ? "solid" : "outlined"}>
                  {pill === "out" ? "Out" : "Low"}
                </Badge>
              )}
            </span>
          }
          description={skipped ? "Skipped / not here" : description}
          descriptionClassName={cn(
            skipped && "text-[10px] font-semibold tracking-widest text-foreground uppercase"
          )}
        />
      </button>
      <button
        type="button"
        aria-label={countLabel}
        disabled={got}
        onClick={onCountClick}
        className="-mr-2 flex shrink-0 items-center self-stretch pr-2 pl-4 outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset"
      >
        <CountBox variant={got ? "done" : skipped ? "skipped" : "default"}>{remaining}</CountBox>
      </button>
    </ListRow>
  )
}

export { ItemRow, type ItemRowState, type StockStatus }

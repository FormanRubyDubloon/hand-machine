import * as React from "react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { CountBox } from "@/components/ui/count-box"
import { ListRow, ListRowText } from "@/components/ui/list-row"

type ItemRowState = "to-get" | "partly-got" | "got" | "skipped"
type StockStatus = "out" | "low"

/**
 * A shopping item: name, stock pill, sub-line and a count box.
 * Tapping the row is the main action (add one). Wrap in SwipeRow for swipes.
 */
function ItemRow({
  className,
  name,
  description,
  stock,
  state = "to-get",
  remaining,
  ...props
}: Omit<React.ComponentProps<"button">, "name"> & {
  name: string
  description?: React.ReactNode
  stock?: StockStatus | null
  state?: ItemRowState
  /** How many are still to get. Shown in the count box. */
  remaining?: number
}) {
  const got = state === "got"
  const skipped = state === "skipped"
  // A fully bought item loses its pill. A skipped one keeps it.
  const pill = stock && !got ? stock : null

  return (
    <ListRow asChild tone={skipped ? "muted" : "default"} className={cn(className)}>
      <button type="button" data-state={state} {...props}>
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
        <CountBox variant={got ? "done" : skipped ? "skipped" : "default"}>{remaining}</CountBox>
      </button>
    </ListRow>
  )
}

export { ItemRow, type ItemRowState, type StockStatus }

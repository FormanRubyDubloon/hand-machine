import * as React from "react"
import { CheckIcon } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * A 28px square that shows a selection: a store you're in, or a sync choice.
 * Presentational only; the row around it carries the role and state.
 */
function TickBox({
  className,
  checked = false,
  inverse = false,
  ...props
}: React.ComponentProps<"span"> & { checked?: boolean; inverse?: boolean }) {
  return (
    <span
      aria-hidden="true"
      data-slot="tick-box"
      data-state={checked ? "checked" : "unchecked"}
      className={cn(
        "inline-flex size-7 shrink-0 items-center justify-center [&_svg]:size-4.5",
        checked
          ? inverse
            ? "bg-primary-foreground text-primary"
            : "bg-primary text-primary-foreground"
          : inverse
            ? "border border-primary-foreground/40"
            : "border border-ring",
        className
      )}
      {...props}
    >
      {checked && <CheckIcon strokeWidth={2.5} />}
    </span>
  )
}

export { TickBox }

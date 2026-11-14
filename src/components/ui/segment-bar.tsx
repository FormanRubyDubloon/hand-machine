import * as React from "react"
import { cn } from "@/lib/utils"

/** One short line per step, e.g. per aisle. Filled lines show progress. */
function SegmentBar({
  className,
  total,
  filled,
  ...props
}: React.ComponentProps<"div"> & { total: number; filled: number }) {
  return (
    <div
      data-slot="segment-bar"
      role="img"
      className={cn("flex gap-1", className)}
      {...props}
    >
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={cn("h-0.5 flex-1 transition-colors", i < filled ? "bg-primary" : "bg-border")}
        />
      ))}
    </div>
  )
}

export { SegmentBar }

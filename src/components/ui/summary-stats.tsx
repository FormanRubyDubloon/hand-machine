import * as React from "react"
import { ChevronRightIcon } from "lucide-react"
import { cn } from "@/lib/utils"

type Stat = {
  label: string
  value: React.ReactNode
  /** Makes the whole cell a button with a chevron, e.g. a count that opens its list. */
  onClick?: () => void
}

/** A row of big numbers with small labels, e.g. To get · Out of stock · Want to cook. */
function SummaryStats({
  className,
  stats,
  ...props
}: React.ComponentProps<"dl"> & { stats: Stat[] }) {
  return (
    <dl
      data-slot="summary-stats"
      className={cn("grid border-b border-border", className)}
      style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` }}
      {...props}
    >
      {stats.map((stat) => {
        const cell = (
          <>
            <dt className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
              {stat.label}
            </dt>
            <dd className="text-[40px] leading-none font-semibold tabular-nums">{stat.value}</dd>
          </>
        )
        const cellClass = "flex flex-col-reverse gap-1.5 border-r border-border p-5 last:border-r-0"
        return stat.onClick ? (
          // A button around the dt/dd keeps the list semantics: the group still reads "label, value".
          <div key={stat.label} className={cn(cellClass, "relative")}>
            {cell}
            <button
              type="button"
              onClick={stat.onClick}
              aria-label={`${stat.label}: ${stat.value}. Open`}
              className="absolute inset-0 flex items-start justify-end p-3 outline-none hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset"
            >
              <ChevronRightIcon className="size-4 text-muted-foreground" aria-hidden="true" />
            </button>
          </div>
        ) : (
          <div key={stat.label} className={cellClass}>
            {cell}
          </div>
        )
      })}
    </dl>
  )
}

export { SummaryStats, type Stat }

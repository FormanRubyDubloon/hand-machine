import * as React from "react"
import { cn } from "@/lib/utils"

type Stat = { label: string; value: React.ReactNode }

/** A row of big numbers with small labels, e.g. To get · Out of stock · On order. */
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
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="flex flex-col-reverse gap-1.5 border-r border-border p-5 last:border-r-0"
        >
          <dt className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
            {stat.label}
          </dt>
          <dd className="text-[40px] leading-none font-semibold tabular-nums">{stat.value}</dd>
        </div>
      ))}
    </dl>
  )
}

export { SummaryStats, type Stat }

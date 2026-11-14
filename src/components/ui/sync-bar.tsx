import * as React from "react"
import { RefreshCwIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Progress } from "@/components/ui/progress"

/** A dark status bar for background work, with a thin progress line. */
function SyncBar({
  className,
  label = "Syncing",
  detail,
  progress,
  note,
  ...props
}: React.ComponentProps<"div"> & {
  label?: React.ReactNode
  detail?: React.ReactNode
  progress: number
  note?: React.ReactNode
}) {
  return (
    <div
      data-slot="sync-bar"
      role="status"
      className={cn(
        "flex flex-col gap-2.5 bg-primary px-5 py-3.5 text-primary-foreground",
        className
      )}
      {...props}
    >
      <div className="flex items-center justify-between gap-4">
        <span className="flex items-center gap-2 text-xs font-semibold tracking-widest uppercase">
          <RefreshCwIcon className="size-4 animate-spin [animation-duration:2s]" aria-hidden="true" />
          {label}
        </span>
        {detail && <span className="text-sm text-primary-foreground/70">{detail}</span>}
      </div>
      <Progress
        value={progress}
        aria-label="Sync progress"
        className="bg-primary-foreground/20 [&_[data-slot=progress-indicator]]:bg-primary-foreground"
      />
      {note && <span className="text-[13px] leading-[18px] text-primary-foreground/70">{note}</span>}
    </div>
  )
}

export { SyncBar }

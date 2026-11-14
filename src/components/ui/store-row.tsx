import * as React from "react"
import { PencilIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ListRow, ListRowText } from "@/components/ui/list-row"
import { TickBox } from "@/components/ui/tick-box"

/** A store you can pick (tap the name) or edit (tap the pencil). */
function StoreRow({
  className,
  name,
  description,
  current = false,
  onSelect,
  onEdit,
}: {
  className?: string
  name: string
  description?: React.ReactNode
  current?: boolean
  onSelect?: () => void
  onEdit?: () => void
}) {
  return (
    <ListRow tone={current ? "current" : "default"} className={cn("gap-3", className)}>
      <button
        type="button"
        onClick={onSelect}
        aria-current={current || undefined}
        aria-label={current ? `${name}, current store` : `Shop at ${name}`}
        className="flex min-h-21 flex-1 items-center gap-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <TickBox checked={current} inverse={current} />
        <ListRowText title={name} description={description} />
      </button>
      {onEdit && (
        <Button
          variant="outline"
          size="icon-lg"
          aria-label={`Edit ${name}`}
          onClick={onEdit}
          className={cn(
            "[&_svg:not([class*='size-'])]:size-4.5",
            current &&
              "border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
          )}
        >
          <PencilIcon />
        </Button>
      )}
    </ListRow>
  )
}

export { StoreRow }

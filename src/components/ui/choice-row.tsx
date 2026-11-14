import * as React from "react"
import { cn } from "@/lib/utils"
import { ListRow, ListRowText } from "@/components/ui/list-row"
import { TickBox } from "@/components/ui/tick-box"

/** One answer in a pick-one list: tick box, small label, value, sub-line. */
function ChoiceRow({
  className,
  label,
  value,
  description,
  selected = false,
  ...props
}: Omit<React.ComponentProps<"button">, "value"> & {
  label: React.ReactNode
  value: React.ReactNode
  description?: React.ReactNode
  selected?: boolean
}) {
  return (
    <ListRow asChild size="lg" tone={selected ? "muted" : "default"} className={cn(className)}>
      <button type="button" role="radio" aria-checked={selected} {...props}>
        <TickBox checked={selected} />
        <ListRowText eyebrow={label} title={value} description={description} titleSize="md" />
      </button>
    </ListRow>
  )
}

export { ChoiceRow }

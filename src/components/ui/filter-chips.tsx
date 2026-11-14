import { cn } from "@/lib/utils"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

type FilterChip<T extends string> = { value: T; label: string; count?: number }

/**
 * Pick-one filter shown as rounded chips with a count inside.
 * Built on ToggleGroup (single). One chip is always on.
 */
function FilterChips<T extends string>({
  className,
  options,
  value,
  onValueChange,
  "aria-label": ariaLabel = "Filter",
}: {
  className?: string
  options: FilterChip<T>[]
  value: T
  onValueChange: (value: T) => void
  "aria-label"?: string
}) {
  return (
    <ToggleGroup
      data-slot="filter-chips"
      type="single"
      spacing={2}
      value={value}
      onValueChange={(v) => v && onValueChange(v as T)}
      aria-label={ariaLabel}
      className={className}
    >
      {options.map((o) => (
        <ToggleGroupItem
          key={o.value}
          value={o.value}
          className={cn(
            "group/chip h-9 gap-1.5 rounded-full border border-border bg-background px-3.5 text-foreground",
            "hover:bg-muted data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
          )}
        >
          {o.label}
          {o.count !== undefined && (
            <span className="font-normal tracking-normal text-muted-foreground tabular-nums group-data-[state=on]/chip:text-primary-foreground/70">
              {o.count}
            </span>
          )}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

export { FilterChips, type FilterChip }

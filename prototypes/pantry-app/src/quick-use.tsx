// The quick-use buttons for one item: Used 1 and All for counted items, Finished and Open for bulk.
// Home's cards use the full size; search results use the compact one.
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { isBulk, unitWord, type Item } from "./model"
import { usePantry } from "./state"

/**
 * Nothing when the item is out of stock. `compact` gives small buttons that size to their label, for a
 * row. In a row that is itself clickable (a search result), the buttons keep the click to themselves
 * and don't take focus, so the row doesn't open and the search stays open.
 */
export function QuickUseActions({ item, compact, className }: { item: Item; compact?: boolean; className?: string }) {
  const { actions } = usePantry()
  if (item.inStock === 0) return null
  const bulk = isBulk(item)
  const canOpen = bulk && (item.open ?? 0) < item.inStock
  const size = compact ? "h-7 px-2.5" : "h-9"
  const keep = {
    onMouseDown: (e: React.MouseEvent) => e.preventDefault(),
    onPointerDown: (e: React.PointerEvent) => e.stopPropagation(),
  }
  const act = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation()
    fn()
  }
  return bulk ? (
    <div className={cn("flex gap-2", compact && "gap-1.5", className)}>
      <Button size="xs" className={cn(size, !compact && "min-w-0 flex-1 px-2")} {...keep} onClick={act(() => actions.finishPack(item.id))}>
        Finished
      </Button>
      {canOpen && (
        <Button size="xs" variant="outline" className={cn(size, "border-primary", !compact && "min-w-0 flex-1 px-2")} {...keep} onClick={act(() => actions.openPack(item.id))}>
          Open
        </Button>
      )}
    </div>
  ) : (
    <div className={cn("flex gap-2", compact && "gap-1.5", className)}>
      <Button size="xs" className={cn(size, !compact && "flex-1")} {...keep} onClick={act(() => actions.useOne(item.id))}>
        Used 1
      </Button>
      <Button
        size="xs"
        variant="outline"
        className={cn(size, "border-primary", !compact && "px-4")}
        {...keep}
        onClick={act(() => actions.useAll(item.id))}
        aria-label={`Used all ${unitWord(item, 2) || item.name.toLowerCase()}`}
      >
        All
      </Button>
    </div>
  )
}

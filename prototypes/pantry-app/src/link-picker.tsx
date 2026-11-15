// Picking the pantry item a recipe ingredient points at. Used in the recipe view (on unlinked rows) and the
// recipe editor (every row).
import * as React from "react"
import { CheckIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { containsText, haveText, namesOf, type Item } from "./model"
import { usePantry } from "./state"

/** Words in a recipe's wording that describe preparation or size, not the ingredient. */
const PREP_WORDS = new Set(
  "chopped sliced diced minced grated peeled crushed ground fresh dried large small big medium handful handfuls tbsp tsp cup cups glass pinch the and for optional roughly finely about".split(" "),
)

const stem = (w: string) => w.replace(/(es|s)$/, "")

/** Pantry items whose name appears in the wording, whole-name matches first ("tomato purée" in "70g tomato purée"). */
function likelyItems(pantry: Item[], text: string) {
  const t = text.toLowerCase()
  const words = t.replace(/[^a-z\s-]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !PREP_WORDS.has(w))
  const whole = (i: Item) => namesOf(i).some((n) => t.includes(n.toLowerCase()))
  const shared = (i: Item) => namesOf(i).some((n) => n.toLowerCase().split(/\s+/).some((p) => words.some((w) => stem(p) === stem(w))))
  return pantry.filter((i) => whole(i) || shared(i)).sort((a, b) => Number(whole(b)) - Number(whole(a)))
}

/**
 * A pantry search in a popover. Items that look like the recipe's wording come first under Likely; the search
 * covers the whole pantry. `trigger` is the button that opens it. With `onUnlink`, a linked row also offers
 * "Not linked" to clear the link.
 */
export function ItemPicker({
  text, value, onPick, onUnlink, trigger, align = "start",
}: {
  text: string
  value?: string
  onPick: (id: string) => void
  onUnlink?: () => void
  trigger: React.ReactNode
  align?: "start" | "end"
}) {
  const { items } = usePantry()
  const [open, setOpen] = React.useState(false)
  const pantry = Object.values(items).filter((i) => !i.oneOff).sort((a, b) => a.name.localeCompare(b.name))
  const likely = text.trim() ? likelyItems(pantry, text) : []
  const rest = pantry.filter((i) => !likely.includes(i))
  const pick = (id: string) => { setOpen(false); onPick(id) }
  const row = (i: Item) => (
    <CommandItem key={i.id} value={i.id} keywords={namesOf(i)} onSelect={() => pick(i.id)}>
      <CheckIcon className={cn("size-3.5", i.id === value ? "opacity-100" : "opacity-0")} />
      <span className="flex-1 truncate">{i.name}</span>
      <span className="text-xs text-muted-foreground">{i.inStock ? haveText(i) : "none"}</span>
    </CommandItem>
  )
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align={align} className="w-80 p-0" onClick={(e) => e.stopPropagation()}>
        {/* Plain "contains" matching, like the top-bar search. cmdk's fuzzy default finds Sourdough for "sug". */}
        <Command filter={(_, search, keywords) => ((keywords ?? []).some((n) => containsText(n, search)) ? 1 : 0)}>
          <CommandInput placeholder="Search the pantry" aria-label={`Pantry item for ${text || "this ingredient"}`} />
          <CommandList>
            <CommandEmpty>Nothing in the pantry by that name.</CommandEmpty>
            {value && onUnlink && (
              <CommandGroup>
                <CommandItem value="__unlink" keywords={["not linked"]} onSelect={() => { setOpen(false); onUnlink() }}>
                  <span className="size-3.5" />
                  <span className="flex-1 text-muted-foreground">Not linked</span>
                </CommandItem>
              </CommandGroup>
            )}
            {likely.length > 0 && <CommandGroup heading="Likely">{likely.map(row)}</CommandGroup>}
            <CommandGroup heading={likely.length ? "Everything else" : "Pantry"}>{rest.map(row)}</CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

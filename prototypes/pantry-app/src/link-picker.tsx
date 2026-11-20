// Picking the pantry item a recipe ingredient points at. Used in the recipe view (on unlinked rows), the recipe
// editor (every row) and the recipe page's "I have this" dialog.
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

/** Pantry items that look like the wording, best first. Empty when nothing matches. */
export function useLikelyItems(text: string) {
  const { items } = usePantry()
  const pantry = Object.values(items).filter((i) => !i.oneOff).sort((a, b) => a.name.localeCompare(b.name))
  return { pantry, likely: text.trim() ? likelyItems(pantry, text) : [] }
}

/**
 * The pantry search on its own: a search field and a list, items that look like the recipe's wording first under
 * Likely. Used in the popover below and inline in the recipe page's "I have this" dialog. `before` goes at the top
 * of the list (the popover's "Not linked").
 */
export function ItemSearch({
  text, value, onPick, before, className, listClassName, inputRef,
}: {
  text: string
  value?: string
  onPick: (id: string) => void
  before?: React.ReactNode
  className?: string
  listClassName?: string
  inputRef?: React.Ref<HTMLInputElement>
}) {
  const { pantry, likely } = useLikelyItems(text)
  const rest = pantry.filter((i) => !likely.includes(i))
  const row = (i: Item) => (
    <CommandItem key={i.id} value={i.id} keywords={namesOf(i)} onSelect={() => onPick(i.id)}>
      <CheckIcon className={cn("size-3.5", i.id === value ? "opacity-100" : "opacity-0")} />
      <span className="flex-1 truncate">{i.name}</span>
      <span className="text-xs text-muted-foreground">{i.inStock ? haveText(i) : "none"}</span>
    </CommandItem>
  )
  return (
    // Plain "contains" matching, like the top-bar search. cmdk's fuzzy default finds Sourdough for "sug".
    <Command className={className} filter={(_, search, keywords) => ((keywords ?? []).some((n) => containsText(n, search)) ? 1 : 0)}>
      <CommandInput ref={inputRef} placeholder="Search the pantry" aria-label={`Pantry item for ${text || "this ingredient"}`} />
      <CommandList className={listClassName}>
        <CommandEmpty>Nothing in the pantry by that name.</CommandEmpty>
        {before}
        {likely.length > 0 && <CommandGroup heading="Likely">{likely.map(row)}</CommandGroup>}
        <CommandGroup heading={likely.length ? "Everything else" : "Pantry"}>{rest.map(row)}</CommandGroup>
      </CommandList>
    </Command>
  )
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
  const [open, setOpen] = React.useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align={align} className="w-80 p-0" onClick={(e) => e.stopPropagation()}>
        <ItemSearch
          text={text}
          value={value}
          onPick={(id) => { setOpen(false); onPick(id) }}
          before={
            value && onUnlink && (
              <CommandGroup>
                <CommandItem value="__unlink" keywords={["not linked"]} onSelect={() => { setOpen(false); onUnlink() }}>
                  <span className="size-3.5" />
                  <span className="flex-1 text-muted-foreground">Not linked</span>
                </CommandItem>
              </CommandGroup>
            )
          }
        />
      </PopoverContent>
    </Popover>
  )
}

// History (moved off Home on 27 Nov 2026, with the new Home design): a side panel opened from the clock in the
// header, or Home's review bar. Filter by who, Undo and Revert for today's changes, and when the phone last synced.
import * as React from "react"
import { SmartphoneIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FilterChips } from "@/components/ui/filter-chips"
import { isToday, shortDate, timeText, type Db, type HistoryEntry, type Items, type Who } from "./model"
import { href } from "./router"
import { canRevert, canUndo, usePantry } from "./state"
import { HistoryRow, SidePanel, type HistoryLinks } from "./components"

const OPEN = "collca:history"
/** Opens the History panel from anywhere (the header's clock, Home's review bar). */
export const openHistory = () => window.dispatchEvent(new Event(OPEN))

const MAX_ITEM_LINKS = 4

/**
 * What a History entry links to. A recipe or a single item opens in the side panel here; an entry
 * about several items links each one. Store and category changes go to their settings. Things that
 * have since been deleted don't link.
 */
function linksFor(entry: HistoryEntry, db: Db, items: Items): HistoryLinks | undefined {
  const recipe = entry.recipeId ? db.recipes.find((r) => r.id === entry.recipeId) : undefined
  const live = [...new Set(entry.itemIds ?? [])].filter((id) => items[id])
  const itemLinks = live.length > 1
    ? { items: live.slice(0, MAX_ITEM_LINKS).map((id) => ({ href: href({ name: "home", item: id }), label: items[id].name })), more: Math.max(0, live.length - MAX_ITEM_LINKS) }
    : {}
  if (recipe) return { href: href({ name: "home", recipe: recipe.id }), ...itemLinks }
  if (live.length === 1) return { href: href({ name: "home", item: live[0] }) }
  if (entry.itemIds?.length) return itemLinks
  // No item or recipe: a category or store change. Claude's store entries carry no store id, so
  // the store is found by its name in the title (the longest name wins, so "Co-op" loses to "Co-op Express").
  // Tag entries (called category before 24 Nov 2026) open Settings → Tags.
  if (/\b(category|tag)\b/i.test(entry.title)) return { href: href({ name: "settings", tab: "tags" }) }
  const store = [...db.stores].sort((a, b) => b.name.length - a.name.length).find((x) => x.name && entry.title.includes(x.name))
  if (store) return { href: href({ name: "settings", tab: "stores", store: store.id }) }
  if (/\bstore\b/i.test(entry.title)) return { href: href({ name: "settings", tab: "stores" }) }
  return undefined
}

function History() {
  const { db, items, actions, phoneSyncedAt } = usePantry()
  const [who, setWho] = React.useState<"all" | Who>("all")
  const [shown, setShown] = React.useState(6)
  const entries = db.history.filter((h) => who === "all" || h.who === who)
  return (
    <section aria-label="History" className="flex flex-col gap-3">
      <FilterChips
        aria-label="Who made the change"
        value={who}
        onValueChange={(v) => {
          setWho(v)
          setShown(6)
        }}
        options={[
          { value: "all", label: "All" },
          { value: "you", label: "You" },
          { value: "claude", label: "Claude" },
          { value: "phone", label: "Shopping app" },
        ]}
        className="flex-wrap [&>button]:h-7 [&>button]:px-2.5 [&>button]:text-[10px]"
      />
      <div className="flex flex-col">
        {entries.slice(0, shown).map((h) => (
          <HistoryRow key={h.id} entry={h} compact links={linksFor(h, db, items)} onUndo={canUndo(h) ? () => actions.undo(h.id) : undefined} onRevert={canRevert(h) ? () => actions.revert(h.id) : undefined} />
        ))}
        {entries.length === 0 && <p className="py-4 text-sm text-muted-foreground">Nothing yet.</p>}
      </div>
      {entries.length > shown && (
        <Button variant="link" className="h-auto self-start p-0 text-xs normal-case tracking-normal" onClick={() => setShown(shown + 10)}>
          Show older
        </Button>
      )}
      <span className="flex items-center gap-1.5 border-t border-border pt-3 text-xs text-muted-foreground" title="When the shopping app last synced with the pantry">
        <SmartphoneIcon className="size-3.5" aria-hidden="true" />
        Phone synced {isToday(phoneSyncedAt) ? "today" : shortDate(phoneSyncedAt)}, {timeText(phoneSyncedAt)}
      </span>
    </section>
  )
}


/** Mounted once, in the shell. */
export function HistoryPanel() {
  const [open, setOpen] = React.useState(false)
  React.useEffect(() => {
    const show = () => setOpen(true)
    window.addEventListener(OPEN, show)
    return () => window.removeEventListener(OPEN, show)
  }, [])
  return (
    <SidePanel open={open} onClose={() => setOpen(false)} width={480} title="History" description="Undo works for today's changes.">
      <History />
    </SidePanel>
  )
}

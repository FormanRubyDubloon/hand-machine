// PAN-19: after a phone sync, items that changed here and on the phone since its last sync.
// For each one: keep this app's value, keep the phone's, or count the shelf.
import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { unitText } from "../model"
import { usePantry } from "../state"
import { Eyebrow } from "../components"

type Choice = "here" | "phone" | "count"

function Option({ selected, onSelect, value, title, sub }: { selected: boolean; onSelect: () => void; value: React.ReactNode; title: string; sub: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "flex flex-1 flex-col items-start gap-1 border p-4 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        selected ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted",
      )}
    >
      <span className="text-[28px] leading-none font-semibold tabular-nums">{value}</span>
      <span className="text-sm font-semibold">{title}</span>
      <span className={cn("text-xs", selected ? "text-primary-foreground/70" : "text-muted-foreground")}>{sub}</span>
    </button>
  )
}

export function ConflictsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { db, items, actions } = usePantry()
  const [choices, setChoices] = React.useState<Record<string, Choice>>({})
  const [counts, setCounts] = React.useState<Record<string, string>>({})
  const list = db.conflicts.filter((c) => items[c.itemId])

  const valueOf = (id: string) => {
    const c = list.find((x) => x.itemId === id)!
    const choice = choices[id] ?? "here"
    return choice === "here" ? c.here : choice === "phone" ? c.phone : parseInt(counts[id] ?? "", 10)
  }
  const ready = list.every((c) => Number.isFinite(valueOf(c.itemId)) && valueOf(c.itemId) >= 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-6 p-8 sm:max-w-[760px]">
        <DialogHeader>
          <Eyebrow>Sync</Eyebrow>
          <DialogTitle className="text-[22px] tracking-[0.04em] uppercase">
            {list.length === 1 ? "1 item changed in two places" : `${list.length} items changed in two places`}
          </DialogTitle>
          <DialogDescription>Your phone synced a shop. These items also changed here since the phone's last sync. Which change should stay?</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-6">
          {list.map((c) => {
            const item = items[c.itemId]
            const choice = choices[c.itemId] ?? "here"
            return (
              <div key={c.itemId} className="flex flex-col gap-3">
                <div className="flex items-baseline gap-3">
                  <span className="text-lg font-semibold">{item.name}</span>
                  <Eyebrow>Stock</Eyebrow>
                </div>
                <div role="radiogroup" aria-label={`Stock for ${item.name}`} className="flex gap-3">
                  <Option selected={choice === "here"} onSelect={() => setChoices({ ...choices, [c.itemId]: "here" })} value={c.here} title="Here" sub={c.hereNote} />
                  <Option selected={choice === "phone"} onSelect={() => setChoices({ ...choices, [c.itemId]: "phone" })} value={c.phone} title="Shopping app" sub={c.phoneNote} />
                  <div
                    className={cn("flex flex-1 flex-col gap-1 border p-4", choice === "count" ? "border-primary" : "border-border")}
                    onClick={() => setChoices({ ...choices, [c.itemId]: "count" })}
                  >
                    <Input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      aria-label={`Count of ${item.name} on the shelf`}
                      placeholder="–"
                      value={counts[c.itemId] ?? ""}
                      onFocus={() => setChoices({ ...choices, [c.itemId]: "count" })}
                      onChange={(e) => setCounts({ ...counts, [c.itemId]: e.target.value })}
                      className="h-8 w-20 text-[28px] font-semibold md:text-[28px]"
                    />
                    <span className="text-sm font-semibold">Enter it</span>
                    <span className="text-xs text-muted-foreground">Count what's on the shelf{item.unit ? ` (${unitText(item, 2).split(" ")[1]})` : ""}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        <p className="text-[13px] text-muted-foreground">Everything else from the shop synced. Until you choose, these keep the value from here.</p>
        <DialogFooter className="sm:justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Decide later
          </Button>
          <Button
            disabled={!ready}
            onClick={() => {
              actions.resolveConflicts(Object.fromEntries(list.map((c) => [c.itemId, valueOf(c.itemId)])))
              onOpenChange(false)
            }}
          >
            Keep these
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// To review, on Home (27 Nov 2026): a one-line bar ("9 things to check") whose Review opens the list in place
// (Isaac's choice, with the new Home design). The list has two tabs, as on the phone. New lists items marked New (added from a recipe,
// an import or Claude, with their location and aisle guessed), each with Open and Looks right. Aisles lists guesses
// for items with no aisle in a store, from the tags of items already placed there (guessAisles in the model), each
// with Yes, Change and Not this, and Accept all. The section shows only when there's something to review.
import * as React from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { FilterChips } from "@/components/ui/filter-chips"
import { aisleGuessReason, aisleKey, aisleTitle, guessAisles, locationLabel, tagsOf, withAisle, type AisleGuess, type Item } from "./model"
import { navigate } from "./router"
import { usePantry } from "./state"
import { openHistory } from "./history"

type Tab = "new" | "aisles"

/** "Not this": guesses said no to, "storeId:itemId" to the aisle's key. Kept in this browser only, as on the phone. */
const NO_KEY = "collca.aisleNo"
const readNo = (): Record<string, string> => {
  try {
    return JSON.parse(localStorage.getItem(NO_KEY) || "{}") as Record<string, string>
  } catch {
    return {}
  }
}
const noKey = (g: AisleGuess) => `${g.storeId}:${g.itemId}`

/** How many rows a tab shows before Show all. */
const SHOWN = 6

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

export function ReviewBar() {
  const { db, items, actions } = usePantry()
  const [open, setOpen] = React.useState(false)
  const [tab, setTab] = React.useState<Tab | null>(null)
  const [no, setNo] = React.useState(readNo)
  const [all, setAll] = React.useState(false)

  const list = Object.values(items)
  const fresh = list.filter((i) => i.review && !i.oneOff).sort((a, b) => a.name.localeCompare(b.name))
  // Every store's guesses, the default store first.
  const stores = [...db.stores].sort((a, b) => Number(b.id === db.defaultStoreId) - Number(a.id === db.defaultStoreId))
  const guesses = stores.flatMap((s) => guessAisles(s, list)).filter((g) => no[noKey(g)] !== aisleKey(g.aisle))
  if (!fresh.length && !guesses.length) return null
  // Opens on New when there's anything new, otherwise on Aisles.
  const shown: Tab = tab ?? (fresh.length ? "new" : "aisles")

  const storeName = (id: string) => db.stores.find((s) => s.id === id)?.name ?? ""
  const tagName = (id: string) => db.categories.find((c) => c.id === id)?.name ?? "tagged"
  const sayNo = (g: AisleGuess) => {
    const next = { ...no, [noKey(g)]: aisleKey(g.aisle) }
    setNo(next)
    try {
      localStorage.setItem(NO_KEY, JSON.stringify(next))
    } catch {
      // Private browsing: it comes back next visit.
    }
  }
  const take = (gs: AisleGuess[]) => {
    const key = `aisle-guesses:${Date.now()}`
    for (const g of gs) {
      const item = items[g.itemId]
      if (!item) continue
      actions.saveItem(withAisle(item, g.storeId, g.aisle), false, {
        key: gs.length > 1 ? key : undefined,
        title: gs.length > 1 ? `${gs.length} aisles from guesses` : `${item.name}: ${aisleTitle(g.aisle).toLowerCase()} at ${storeName(g.storeId)}`,
        detail: gs.length > 1 ? gs.map((x) => `${items[x.itemId]?.name}: ${aisleTitle(x.aisle).toLowerCase()} at ${storeName(x.storeId)}`).join(", ") : "A guess from its tags",
      })
    }
    toast(gs.length > 1 ? `Set ${gs.length} aisles` : `${items[gs[0].itemId]?.name}: ${aisleTitle(gs[0].aisle)} at ${storeName(gs[0].storeId)}`, { description: "Undo it from History." })
  }
  const looksRight = (item: Item) => {
    actions.saveItem({ ...item, review: undefined }, false, { title: `Checked ${item.name}`, detail: "Its location and aisle look right" })
    toast(`Saved ${item.name}`)
  }

  const rows = shown === "new" ? fresh : guesses
  const visible = all ? rows : rows.slice(0, SHOWN)

  const total = fresh.length + guesses.length
  const parts = [guesses.length ? plural(guesses.length, "aisle guess from your tags", "aisle guesses from your tags") : "", fresh.length ? plural(fresh.length, "new item", "new items") : ""].filter(Boolean)

  return (
    <section aria-labelledby="to-review" className="flex flex-col rounded-lg bg-muted">
      <div className="flex flex-wrap items-center justify-between gap-4 px-8 py-5">
        <p id="to-review" className="text-[15px]">
          <strong className="font-semibold">{plural(total, "thing", "things")} to check:</strong> {parts.join(", ")}.
        </p>
        <div className="flex items-center gap-6">
          <Button variant="link" className="h-auto p-0 text-sm normal-case tracking-normal" onClick={openHistory}>History</Button>
          <Button variant="outline" className="border-foreground bg-transparent" aria-expanded={open} onClick={() => setOpen(!open)}>
            {open ? "Hide" : "Review"}
          </Button>
        </div>
      </div>
      {open && (
        <div className="flex flex-col gap-3 border-t border-border bg-background px-8 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-[13px] text-muted-foreground">
            {shown === "new" ? "Added for you, with where it lives guessed" : "Aisles guessed from the tags of items you've placed"}
          </span>
          <FilterChips<Tab>
            aria-label="What to review"
            value={shown}
            onValueChange={(v) => {
              setTab(v)
              setAll(false)
            }}
            options={[
              { value: "new", label: "New", count: fresh.length },
              { value: "aisles", label: "Aisles", count: guesses.length },
            ]}
          />
        </div>

        <div className="flex flex-col rounded-lg border border-border">
          {shown === "new" &&
            (visible as Item[]).map((i) => (
              <div key={i.id} className="flex items-center justify-between gap-4 border-b border-border px-4 py-3 last:border-b-0">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <button type="button" className="text-left text-[15px] font-semibold hover:underline" onClick={() => navigate({ name: "home", item: i.id })}>
                    {i.name}
                  </button>
                  <span className="text-xs text-muted-foreground">{[locationLabel(i.location), ...tagsOf(i).map(tagName)].join(" · ")}</span>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button size="xs" variant="outline" onClick={() => navigate({ name: "home", item: i.id })}>Open</Button>
                  <Button size="xs" onClick={() => looksRight(i)}>Looks right</Button>
                </div>
              </div>
            ))}
          {shown === "aisles" &&
            (visible as AisleGuess[]).map((g) => {
              const item = items[g.itemId]
              return (
                <div key={noKey(g)} className="flex items-center justify-between gap-4 border-b border-border px-4 py-3 last:border-b-0">
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-[15px] font-semibold">
                      {item?.name} <span className="font-normal text-muted-foreground">· {aisleTitle(g.aisle)} at {storeName(g.storeId)}</span>
                    </span>
                    <span className="text-xs text-muted-foreground">{aisleGuessReason(g, tagName(g.tagId))}.</span>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button size="xs" variant="ghost" className="text-muted-foreground" onClick={() => sayNo(g)} aria-label={`Not ${aisleTitle(g.aisle)} for ${item?.name}. Don't suggest it again`}>Not this</Button>
                    <Button size="xs" variant="outline" onClick={() => navigate({ name: "home", item: g.itemId })} aria-label={`Choose another aisle for ${item?.name}`}>Change</Button>
                    <Button size="xs" onClick={() => take([g])} aria-label={`Yes, ${item?.name} is in ${aisleTitle(g.aisle)} at ${storeName(g.storeId)}`}>Yes</Button>
                  </div>
                </div>
              )
            })}
          {!rows.length && (
            <p className="px-4 py-3 text-sm text-muted-foreground">{shown === "new" ? "Nothing new to check." : "No aisle guesses to check."}</p>
          )}
        </div>

        <div className="flex items-center gap-4">
          {rows.length > SHOWN && (
            <Button variant="link" className="h-auto p-0 text-xs normal-case tracking-normal" onClick={() => setAll(!all)}>
              {all ? "Show fewer" : `Show all ${rows.length}`}
            </Button>
          )}
          {shown === "aisles" && guesses.length > 1 && (
            <Button size="xs" variant="outline" className="ml-auto" onClick={() => take(guesses)}>Accept all {guesses.length}</Button>
          )}
        </div>
        </div>
      )}
    </section>
  )
}

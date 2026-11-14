import * as React from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { CountBox } from "@/components/ui/count-box"
import { FilterChips } from "@/components/ui/filter-chips"
import { ItemRow } from "@/components/ui/item-row"
import { ListRow } from "@/components/ui/list-row"
import { SegmentBar } from "@/components/ui/segment-bar"
import { SwipeRow } from "@/components/ui/swipe-row"
import { itemDescription, matchesFilter, plural, type ListItem, type ShopAisle } from "../model"
import { navigate, Redirect } from "../router"
import { useApp } from "../state"
import { MenuButton, Note, Screen, SplitButton } from "../layout"
import { AddItemDrawer } from "./add-item-drawer"

const rank = { "to-get": 0, "partly-got": 0, skipped: 1, got: 2 } as const

export function Shop() {
  const { state, sessionStore, aisles } = useApp()
  const session = state.session

  if (!session || !sessionStore) return <Redirect to={{ name: "home" }} />

  if (aisles.length === 0)
    return (
      <Screen
        eyebrow={sessionStore.name}
        title="Nothing here"
        footer={
          <div className="flex gap-2.5">
            <Button variant="outline" size="lg" className="flex-1 border-primary" onClick={() => navigate({ name: "stores" })}>
              Shop at another store
            </Button>
            <MenuButton />
          </div>
        }
      >
        <Note>Nothing on the list is sold at {sessionStore.name}. Check its aisle numbers, or pick another store.</Note>
      </Screen>
    )

  const index = Math.min(session.aisleIndex, aisles.length - 1)
  // Keyed by aisle so the row order is fixed while you're in it.
  return <AisleView key={aisles[index].number} index={index} />
}

function AisleView({ index }: { index: number }) {
  const { state, actions, sessionStore, aisles } = useApp()
  const aisle: ShopAisle = aisles[index]
  const [adding, setAdding] = React.useState(false)

  // Sort once on entry: to get, then skipped, then got. Rows don't jump under your thumb.
  const [order] = React.useState(() =>
    [...aisle.items].sort((a, b) => rank[a.state] - rank[b.state]).map((li) => li.item.id)
  )
  const byId = new Map(aisle.items.map((li) => [li.item.id, li]))
  const rows = [...order, ...aisle.items.map((li) => li.item.id).filter((id) => !order.includes(id))]
    .map((id) => byId.get(id))
    .filter((li): li is ListItem => !!li)

  const open = aisle.items.filter((li) => li.state !== "got")
  const leftHere = open.filter((li) => !li.skipped).length
  const shown = rows.filter((li) => matchesFilter(li.stock, state.filter))

  const totalLeft = aisles.reduce((n, a) => n + a.items.filter((li) => li.remaining > 0 && !li.skipped).length, 0)
  const aislesLeft = aisles.filter((a) => a.items.some((li) => li.remaining > 0 && !li.skipped)).length
  const next = aisles[index + 1]
  const cleared = leftHere === 0

  const getAll = (li: ListItem) => {
    const before = li.item.inStock
    const wasSkipped = li.skipped
    actions.getAll(li.item.id)
    toast(li.remaining === 1 ? `Got ${li.item.name.toLowerCase()}` : `Got all ${li.remaining} ${li.item.name.toLowerCase()}`, {
      action: { label: "Undo", onClick: () => actions.restore(li.item.id, before, wasSkipped) },
    })
  }
  const skip = (li: ListItem) => {
    actions.skip(li.item.id)
    toast(`Skipped ${li.item.name.toLowerCase()}`, {
      action: { label: "Undo", onClick: () => actions.restore(li.item.id, li.item.inStock, false) },
    })
  }
  const goNext = () => {
    if (next) {
      actions.setAisle(index + 1)
      window.scrollTo(0, 0)
    } else actions.finishShop()
  }

  return (
    <Screen
      top={<SegmentBar total={aisles.length} filled={index + 1} aria-label={`Aisle ${index + 1} of ${aisles.length}`} />}
      eyebrow={`${sessionStore!.name} · aisle ${aisle.number}`}
      title={aisle.name}
      aside={
        <>
          <strong className="font-semibold text-foreground">{leftHere}</strong> left here
        </>
      }
      below={
        <FilterChips
          aria-label="Filter by stock"
          value={state.filter}
          onValueChange={actions.setFilter}
          options={[
            { value: "all", label: "All", count: open.length },
            { value: "out", label: "Out", count: open.filter((li) => li.stock === "out").length },
            { value: "low", label: "Low", count: open.filter((li) => li.stock === "low").length },
          ]}
        />
      }
      footer={
        cleared ? (
          <>
            <SplitButton
              label={next ? "Next aisle" : "Finish shop"}
              detail={next ? next.name : `${plural(aisles.length, "aisle")} done`}
              onClick={goNext}
            />
            <div className="flex gap-2.5">
              <Button variant="outline" size="lg" className="flex-1 border-primary" onClick={() => navigate({ name: "aisles" })}>
                Aisles
              </Button>
              <MenuButton />
            </div>
          </>
        ) : (
          <div className="flex gap-2.5">
            <SplitButton
              className="flex-1"
              label="Aisles"
              detail={
                <>
                  <strong>{totalLeft}</strong> left in {plural(aislesLeft, "aisle")}
                </>
              }
              onClick={() => navigate({ name: "aisles" })}
            />
            <MenuButton />
          </div>
        )
      }
    >
      {shown.map((li) => (
        <SwipeRow
          key={li.item.id}
          right={li.state !== "got" ? { label: `Got all ${li.needed}`, onAction: () => getAll(li) } : undefined}
          left={li.state !== "got" && !li.skipped ? { label: "Skip", onAction: () => skip(li) } : undefined}
        >
          <ItemRow
            name={li.item.name}
            description={itemDescription(li)}
            stock={li.stock}
            state={li.state}
            remaining={li.remaining}
            aria-label={`${li.item.name}, ${li.state === "got" ? "got" : li.skipped ? "skipped" : `${li.remaining} to get`}. Tap to add one.`}
            onClick={() => actions.addOne(li.item.id)}
          />
        </SwipeRow>
      ))}
      {shown.length === 0 && <Note>Nothing {state.filter === "out" ? "out of stock" : "low"} in this aisle.</Note>}
      <ListRow asChild className="min-h-18 border-b-0">
        <button type="button" onClick={() => setAdding(true)}>
          <span className="flex-1 text-xs font-semibold tracking-widest uppercase">Add new item to {aisle.name}</span>
          <CountBox variant="add" />
        </button>
      </ListRow>
      <AddItemDrawer
        open={adding}
        onOpenChange={setAdding}
        categories={state.categories.filter((c) => aisle.categoryIds.includes(c.id))}
        onAdd={actions.addItem}
      />
    </Screen>
  )
}
